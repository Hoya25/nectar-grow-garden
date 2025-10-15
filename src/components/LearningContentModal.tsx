import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Trophy, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LearningModule {
  id: string;
  title: string;
  description: string;
  content_type: string;
  video_url: string | null;
  article_content: string | null;
  duration_minutes: number;
  nctr_reward: number;
  difficulty_level: string;
  category: string;
}

interface LearningContentModalProps {
  module: LearningModule;
  onClose: () => void;
  onTakeQuiz?: () => void;
  isReviewMode?: boolean;
}

export function LearningContentModal({ module, onClose, onTakeQuiz, isReviewMode = false }: LearningContentModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{module.title}</DialogTitle>
              <DialogDescription className="text-base">{module.description}</DialogDescription>
              
              <div className="flex items-center gap-3 mt-4">
                <Badge variant="outline" className="text-xs">
                  {module.category}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{module.duration_minutes} min</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{module.nctr_reward} NCTR</span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-250px)]">
          <div className="p-6">
            {/* Video Content */}
            {module.content_type === "video" && module.video_url && (
              <div className="mb-6">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={module.video_url}
                    className="w-full h-full"
                    allowFullScreen
                    title={module.title}
                  />
                </div>
              </div>
            )}

            {/* Article Content */}
            {module.content_type === "article" && module.article_content && (
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: module.article_content }} />
              </div>
            )}

            {/* Both Video and Article */}
            {module.content_type === "both" && (
              <>
                {module.video_url && (
                  <div className="mb-6">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe
                        src={module.video_url}
                        className="w-full h-full"
                        allowFullScreen
                        title={module.title}
                      />
                    </div>
                  </div>
                )}
                {module.article_content && (
                  <div className="prose prose-slate dark:prose-invert max-w-none mt-6">
                    <div dangerouslySetInnerHTML={{ __html: module.article_content }} />
                  </div>
                )}
              </>
            )}

            {!module.video_url && !module.article_content && (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Content coming soon!</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 pt-4 border-t flex justify-between items-center gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {isReviewMode ? (
            <div className="text-sm text-muted-foreground italic">
              Review only - Reward already claimed
            </div>
          ) : onTakeQuiz ? (
            <Button onClick={onTakeQuiz}>
              Take Quiz & Earn {module.nctr_reward} NCTR
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
