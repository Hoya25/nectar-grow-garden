import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Trophy, Lock, CheckCircle2, PlayCircle } from "lucide-react";

interface LearningModule {
  id: string;
  title: string;
  description: string;
  content_type: string;
  video_url: string | null;
  duration_minutes: number;
  nctr_reward: number;
  lock_type: string;
  difficulty_level: string;
  category: string;
  requires_quiz: boolean;
  min_quiz_score: number;
}

interface UserProgress {
  status: string;
  quiz_passed: boolean;
  quiz_score: number | null;
  reward_claimed: boolean;
}

interface LearningModuleCardProps {
  module: LearningModule;
  progress?: UserProgress;
  onStart: () => void;
  onTakeQuiz: () => void;
}

export function LearningModuleCard({ module, progress, onStart, onTakeQuiz }: LearningModuleCardProps) {
  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "intermediate": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "advanced": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const isCompleted = progress?.status === "completed";
  const isInProgress = progress?.status === "in_progress";

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Thumbnail or Header */}
      <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.1),transparent_70%)]" />
        {module.video_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <PlayCircle className="h-16 w-16 text-primary/60 group-hover:text-primary transition-colors" />
          </div>
        )}
        
        {/* Status Badge */}
        {isCompleted && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-green-500/90 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Category and Difficulty */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs">
            {module.category}
          </Badge>
          <Badge variant="outline" className={`text-xs ${getDifficultyColor(module.difficulty_level)}`}>
            {module.difficulty_level}
          </Badge>
        </div>

        {/* Title and Description */}
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
          {module.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {module.description}
        </p>

        {/* Module Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{module.duration_minutes} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">{module.nctr_reward} NCTR</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="h-4 w-4" />
            <span className="text-xs">{module.lock_type}</span>
          </div>
        </div>

        {/* Quiz Score */}
        {progress?.quiz_score !== null && progress?.quiz_score !== undefined && (
          <div className="mb-4 p-3 bg-primary/5 rounded-lg">
            <p className="text-sm">
              Best Score: <span className="font-bold">{progress.quiz_score}/{module.min_quiz_score} required</span>
              {progress.quiz_passed && (
                <span className="ml-2 text-green-500">✓ Passed</span>
              )}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {isCompleted && progress.reward_claimed ? (
            <>
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 mb-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Completed - Reward Claimed</span>
                </div>
              </div>
              <Button onClick={onStart} variant="outline" className="w-full">
                <PlayCircle className="h-4 w-4 mr-2" />
                Review Content
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onStart} variant="outline" className="w-full">
                <PlayCircle className="h-4 w-4 mr-2" />
                {progress ? "Review Content" : "Start Learning"}
              </Button>
              
              {progress && !progress.reward_claimed && (
                <Button onClick={onTakeQuiz} className="w-full">
                  <Trophy className="h-4 w-4 mr-2" />
                  {progress.quiz_passed ? "Reward Processing..." : "Take Quiz"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
