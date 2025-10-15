import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Trophy, Lock, Clock, CheckCircle2, PlayCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { LearningModuleCard } from "@/components/LearningModuleCard";
import { QuizModal } from "@/components/QuizModal";
import { LearningContentModal } from "@/components/LearningContentModal";

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
  requires_quiz: boolean;
  min_quiz_score: number;
}

interface UserProgress {
  module_id: string;
  status: string;
  content_viewed: boolean;
  quiz_passed: boolean;
  quiz_score: number | null;
  reward_claimed: boolean;
  reward_amount: number;
}

export default function LearnAndEarn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [progress, setProgress] = useState<Record<string, UserProgress>>({});
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (user) {
      loadModules();
    }
  }, [user]);

  const loadModules = async () => {
    try {
      // Load all learning modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("learning_modules")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (modulesError) throw modulesError;

      // Load user's progress
      const { data: progressData, error: progressError } = await supabase
        .from("learning_progress")
        .select("*")
        .eq("user_id", user!.id);

      if (progressError) throw progressError;

      setModules(modulesData || []);
      
      // Convert progress array to object for easy lookup
      const progressMap: Record<string, UserProgress> = {};
      progressData?.forEach((p) => {
        progressMap[p.module_id] = p;
      });
      setProgress(progressMap);
    } catch (error: any) {
      console.error("Error loading modules:", error);
      toast.error("Failed to load learning modules");
    } finally {
      setLoading(false);
    }
  };

  const handleStartModule = async (module: LearningModule) => {
    setSelectedModule(module);
    setShowContent(true);
    
    // Mark as started if not already
    if (!progress[module.id]) {
      const { error } = await supabase
        .from("learning_progress")
        .insert({
          user_id: user!.id,
          module_id: module.id,
          status: "in_progress",
          content_viewed: true,
          started_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Error starting module:", error);
      } else {
        loadModules(); // Reload to get updated progress
      }
    } else if (!progress[module.id].content_viewed) {
      // Mark content as viewed
      const { error } = await supabase
        .from("learning_progress")
        .update({ content_viewed: true })
        .eq("user_id", user!.id)
        .eq("module_id", module.id);

      if (!error) {
        loadModules();
      }
    }
  };

  const handleTakeQuiz = (module: LearningModule) => {
    setSelectedModule(module);
    setShowQuiz(true);
  };

  const handleQuizComplete = () => {
    setShowQuiz(false);
    setSelectedModule(null);
    loadModules(); // Reload to get updated progress
  };

  const calculateOverallProgress = () => {
    if (modules.length === 0) return 0;
    const completed = Object.values(progress).filter(p => p.status === "completed").length;
    return Math.round((completed / modules.length) * 100);
  };

  const getTotalEarned = () => {
    return Object.values(progress)
      .filter(p => p.reward_claimed)
      .reduce((sum, p) => sum + (p.reward_amount || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading learning modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <Button
              variant="ghost"
              onClick={() => navigate('/garden')}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to The Garden
            </Button>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Learn & Earn</h1>
            </div>
            <p className="text-xl text-muted-foreground mb-6">
              Expand your knowledge about The Garden ecosystem while earning NCTR rewards. 
              Watch educational videos, take quizzes, and claim your bounties!
            </p>
            
            {/* Progress Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <Card className="p-4 bg-card/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                    <p className="text-2xl font-bold">{getTotalEarned().toFixed(2)} NCTR</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-card/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">
                      {Object.values(progress).filter(p => p.status === "completed").length}/{modules.length}
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-card/50 backdrop-blur">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Overall Progress</p>
                  <Progress value={calculateOverallProgress()} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-1">{calculateOverallProgress()}%</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Modules */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">Available Modules</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <LearningModuleCard
              key={module.id}
              module={module}
              progress={progress[module.id]}
              onStart={() => handleStartModule(module)}
              onTakeQuiz={() => handleTakeQuiz(module)}
            />
          ))}
        </div>

        {modules.length === 0 && (
          <Card className="p-12 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              No learning modules available yet. Check back soon!
            </p>
          </Card>
        )}
      </div>

      {/* Learning Content Modal */}
      {showContent && selectedModule && (
        <LearningContentModal
          module={selectedModule}
          onClose={() => {
            setShowContent(false);
            setSelectedModule(null);
          }}
          onTakeQuiz={() => {
            setShowContent(false);
            setShowQuiz(true);
          }}
          isReviewMode={progress[selectedModule.id]?.reward_claimed === true}
        />
      )}

      {/* Quiz Modal */}
      {showQuiz && selectedModule && (
        <QuizModal
          module={selectedModule}
          onClose={() => {
            setShowQuiz(false);
            setSelectedModule(null);
          }}
          onComplete={handleQuizComplete}
        />
      )}
    </div>
  );
}
