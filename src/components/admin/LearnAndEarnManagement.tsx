import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { BookOpen, Plus, Edit, Trash2, Save, X, HelpCircle, Upload, Link as LinkIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LearningModule {
  id: string;
  title: string;
  description: string;
  content_type: string;
  video_url: string | null;
  article_content: string | null;
  thumbnail_url: string | null;
  duration_minutes: number;
  nctr_reward: number;
  lock_type: string;
  difficulty_level: string;
  category: string;
  is_active: boolean;
  requires_quiz: boolean;
  min_quiz_score: number;
  display_order: number;
}

interface QuizQuestion {
  id?: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  display_order: number;
}

export default function LearnAndEarnManagement() {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModule, setEditingModule] = useState<LearningModule | null>(null);
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoInputType, setVideoInputType] = useState<"url" | "upload">("url");

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const { data, error } = await supabase
        .from("learning_modules")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setModules(data || []);
    } catch (error: any) {
      console.error("Error loading modules:", error);
      toast.error("Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (moduleId: string) => {
    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("module_id", moduleId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      const parsedQuestions = (data || []).map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string)
      }));
      
      setQuestions(parsedQuestions);
    } catch (error: any) {
      console.error("Error loading questions:", error);
      toast.error("Failed to load quiz questions");
    }
  };

  const handleCreateModule = () => {
    setEditingModule({
      id: "",
      title: "",
      description: "",
      content_type: "video",
      video_url: "",
      article_content: "",
      thumbnail_url: "",
      duration_minutes: 5,
      nctr_reward: 100,
      lock_type: "90LOCK",
      difficulty_level: "beginner",
      category: "general",
      is_active: true,
      requires_quiz: true,
      min_quiz_score: 70,
      display_order: modules.length,
    });
    setVideoInputType("url");
    setShowModuleDialog(true);
  };

  const handleEditModule = (module: LearningModule) => {
    setEditingModule(module);
    setVideoInputType(module.video_url ? "url" : "upload");
    setShowModuleDialog(true);
  };

  const handleVideoUpload = async (file: File) => {
    if (!file) return;

    setUploadingVideo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('learning-videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('learning-videos')
        .getPublicUrl(filePath);

      setEditingModule(prev => prev ? { ...prev, video_url: publicUrl } : null);
      toast.success("Video uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading video:", error);
      toast.error("Failed to upload video");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSaveModule = async () => {
    if (!editingModule) return;

    try {
      const moduleData = {
        title: editingModule.title,
        description: editingModule.description,
        content_type: editingModule.content_type,
        video_url: editingModule.video_url || null,
        article_content: editingModule.article_content || null,
        thumbnail_url: editingModule.thumbnail_url || null,
        duration_minutes: editingModule.duration_minutes,
        nctr_reward: editingModule.nctr_reward,
        lock_type: editingModule.lock_type,
        difficulty_level: editingModule.difficulty_level,
        category: editingModule.category,
        is_active: editingModule.is_active,
        requires_quiz: editingModule.requires_quiz,
        min_quiz_score: editingModule.min_quiz_score,
        display_order: editingModule.display_order,
      };

      if (editingModule.id) {
        // Update existing
        const { error } = await supabase
          .from("learning_modules")
          .update(moduleData)
          .eq("id", editingModule.id);

        if (error) throw error;
        toast.success("Module updated successfully");
      } else {
        // Create new
        const { error } = await supabase
          .from("learning_modules")
          .insert(moduleData);

        if (error) throw error;
        toast.success("Module created successfully");
      }

      setShowModuleDialog(false);
      setEditingModule(null);
      loadModules();
    } catch (error: any) {
      console.error("Error saving module:", error);
      toast.error("Failed to save module");
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this module?")) return;

    try {
      const { error } = await supabase
        .from("learning_modules")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Module deleted successfully");
      loadModules();
    } catch (error: any) {
      console.error("Error deleting module:", error);
      toast.error("Failed to delete module");
    }
  };

  const handleManageQuiz = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    loadQuestions(moduleId);
    setShowQuizDialog(true);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        question_type: "multiple_choice",
        options: ["", "", "", ""],
        correct_answer: "",
        explanation: "",
        display_order: questions.length,
      },
    ]);
  };

  const handleSaveQuestions = async () => {
    if (!selectedModuleId) return;

    try {
      // Delete existing questions
      await supabase
        .from("quiz_questions")
        .delete()
        .eq("module_id", selectedModuleId);

      // Insert new questions
      const questionsToInsert = questions.map(q => ({
        module_id: selectedModuleId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        display_order: q.display_order,
      }));

      const { error } = await supabase
        .from("quiz_questions")
        .insert(questionsToInsert);

      if (error) throw error;
      
      toast.success("Quiz questions saved successfully");
      setShowQuizDialog(false);
    } catch (error: any) {
      console.error("Error saving questions:", error);
      toast.error("Failed to save quiz questions");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Learn & Earn Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage educational modules with quizzes and NCTR rewards
            </p>
          </div>
          <Button onClick={handleCreateModule}>
            <Plus className="h-4 w-4 mr-2" />
            New Module
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {modules.map((module) => (
            <Card key={module.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{module.title}</h3>
                    <Badge variant={module.is_active ? "default" : "secondary"}>
                      {module.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{module.difficulty_level}</Badge>
                    <Badge variant="outline">{module.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span>⏱️ {module.duration_minutes} min</span>
                    <span>🎁 {module.nctr_reward} NCTR</span>
                    <span>🔒 {module.lock_type}</span>
                    <span>📝 Min Score: {module.min_quiz_score}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleManageQuiz(module.id)}
                  >
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Quiz
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditModule(module)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteModule(module.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {modules.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No learning modules yet. Create your first module to get started!
            </div>
          )}
        </div>
      </CardContent>

      {/* Module Editor Dialog */}
      <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModule?.id ? "Edit Module" : "Create New Module"}
            </DialogTitle>
          </DialogHeader>

          {editingModule && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editingModule.title}
                  onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingModule.description}
                  onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Input
                    value={editingModule.category}
                    onChange={(e) => setEditingModule({ ...editingModule, category: e.target.value })}
                    placeholder="e.g., basics, trading, defi"
                  />
                </div>

                <div>
                  <Label>Difficulty Level</Label>
                  <Select
                    value={editingModule.difficulty_level}
                    onValueChange={(value) => setEditingModule({ ...editingModule, difficulty_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Content Type</Label>
                <Select
                  value={editingModule.content_type}
                  onValueChange={(value) => setEditingModule({ ...editingModule, content_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Only</SelectItem>
                    <SelectItem value="article">Article Only</SelectItem>
                    <SelectItem value="both">Video + Article</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Video Section */}
              {(editingModule.content_type === "video" || editingModule.content_type === "both") && (
                <div className="space-y-3 p-4 border rounded-lg">
                  <Label className="text-base font-semibold">Video Content</Label>
                  
                  <Tabs value={videoInputType} onValueChange={(v) => setVideoInputType(v as "url" | "upload")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="url">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Video URL
                      </TabsTrigger>
                      <TabsTrigger value="upload">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Video
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="url" className="space-y-2">
                      <Input
                        value={editingModule.video_url || ""}
                        onChange={(e) => setEditingModule({ ...editingModule, video_url: e.target.value })}
                        placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste a YouTube, Vimeo, or other video URL
                      </p>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-2">
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoUpload(file);
                        }}
                        disabled={uploadingVideo}
                      />
                      {uploadingVideo && (
                        <p className="text-sm text-muted-foreground">Uploading video...</p>
                      )}
                      {editingModule.video_url && videoInputType === "upload" && (
                        <p className="text-xs text-green-600">✓ Video uploaded</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Upload MP4, WebM, or other video files (max 50MB)
                      </p>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Article Section */}
              {(editingModule.content_type === "article" || editingModule.content_type === "both") && (
                <div className="space-y-3 p-4 border rounded-lg">
                  <Label className="text-base font-semibold">Article Content</Label>
                  <Textarea
                    value={editingModule.article_content || ""}
                    onChange={(e) => setEditingModule({ ...editingModule, article_content: e.target.value })}
                    placeholder="Write your article content here. You can use HTML for formatting:&#10;&#10;<h2>Section Title</h2>&#10;<p>Paragraph text...</p>&#10;<ul>&#10;  <li>Bullet point</li>&#10;</ul>"
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports HTML formatting: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;strong&gt;, &lt;em&gt;, etc.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={editingModule.duration_minutes}
                    onChange={(e) => setEditingModule({ ...editingModule, duration_minutes: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>NCTR Reward</Label>
                  <Input
                    type="number"
                    value={editingModule.nctr_reward}
                    onChange={(e) => setEditingModule({ ...editingModule, nctr_reward: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Lock Type</Label>
                  <Select
                    value={editingModule.lock_type}
                    onValueChange={(value) => setEditingModule({ ...editingModule, lock_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90LOCK">90LOCK</SelectItem>
                      <SelectItem value="360LOCK">360LOCK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Quiz Score (%)</Label>
                  <Input
                    type="number"
                    value={editingModule.min_quiz_score}
                    onChange={(e) => setEditingModule({ ...editingModule, min_quiz_score: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={editingModule.display_order}
                    onChange={(e) => setEditingModule({ ...editingModule, display_order: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingModule.is_active}
                    onCheckedChange={(checked) => setEditingModule({ ...editingModule, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingModule.requires_quiz}
                    onCheckedChange={(checked) => setEditingModule({ ...editingModule, requires_quiz: checked })}
                  />
                  <Label>Requires Quiz</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowModuleDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveModule}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Module
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quiz Editor Dialog */}
      <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Quiz Questions</DialogTitle>
            <DialogDescription>
              Create questions for this learning module. Students must pass the quiz to claim their NCTR reward.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {questions.map((question, qIndex) => (
              <Card key={qIndex} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Question {qIndex + 1}</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Input
                    placeholder="Question text"
                    value={question.question_text}
                    onChange={(e) => {
                      const newQuestions = [...questions];
                      newQuestions[qIndex].question_text = e.target.value;
                      setQuestions(newQuestions);
                    }}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    {question.options.map((option, oIndex) => (
                      <Input
                        key={oIndex}
                        placeholder={`Option ${oIndex + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newQuestions = [...questions];
                          newQuestions[qIndex].options[oIndex] = e.target.value;
                          setQuestions(newQuestions);
                        }}
                      />
                    ))}
                  </div>

                  <Select
                    value={question.correct_answer}
                    onValueChange={(value) => {
                      const newQuestions = [...questions];
                      newQuestions[qIndex].correct_answer = value;
                      setQuestions(newQuestions);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select correct answer" />
                    </SelectTrigger>
                    <SelectContent>
                      {question.options.filter(o => o).map((option, i) => (
                        <SelectItem key={i} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Textarea
                    placeholder="Explanation (shown after answering)"
                    value={question.explanation}
                    onChange={(e) => {
                      const newQuestions = [...questions];
                      newQuestions[qIndex].explanation = e.target.value;
                      setQuestions(newQuestions);
                    }}
                    rows={2}
                  />
                </div>
              </Card>
            ))}

            <Button onClick={handleAddQuestion} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowQuizDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveQuestions}>
                <Save className="h-4 w-4 mr-2" />
                Save Quiz
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
