import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Trophy, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  correct_answer: string;
  explanation: string;
}

interface QuizResult {
  success: boolean;
  passed: boolean;
  score: number;
  reward_amount?: number;
  lock_type?: string;
  reward_already_claimed?: boolean;
  message?: string;
}

interface LearningModule {
  id: string;
  title: string;
  nctr_reward: number;
  lock_type: string;
  min_quiz_score: number;
}

interface QuizModalProps {
  module: LearningModule;
  onClose: () => void;
  onComplete: () => void;
}

export function QuizModal({ module, onClose, onComplete }: QuizModalProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  useEffect(() => {
    loadQuestions();
  }, [module.id]);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("module_id", module.id)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Parse options from JSONB
      const parsedQuestions = (data || []).map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string)
      }));
      setQuestions(parsedQuestions);
    } catch (error: any) {
      console.error("Error loading questions:", error);
      toast.error("Failed to load quiz questions");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    // Check all questions are answered
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }

    setSubmitting(true);

    try {
      // Calculate score
      let correctCount = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correct_answer) {
          correctCount++;
        }
      });

      // Process quiz completion via database function
      const { data, error } = await supabase.rpc("process_quiz_completion", {
        p_user_id: user!.id,
        p_module_id: module.id,
        p_score: correctCount,
        p_total_questions: questions.length,
        p_answers: answers,
      });

      if (error) throw error;

      const result = data as unknown as QuizResult;
      setScore(correctCount);
      setPassed(result.passed);
      setRewardAmount(result.reward_amount || 0);
      setShowResults(true);

      if (result.passed) {
        toast.success(`Congratulations! You passed with ${correctCount}/${questions.length} correct!`);
        if (result.reward_amount && result.reward_amount > 0) {
          toast.success(`You earned ${result.reward_amount} NCTR (${result.lock_type})!`);
        }
      } else {
        toast.error(`You scored ${correctCount}/${questions.length}. Try again!`);
      }
    } catch (error: any) {
      console.error("Error submitting quiz:", error);
      toast.error("Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
    setScore(0);
  };

  const handleFinish = () => {
    onComplete();
    onClose();
  };

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading quiz...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Handle no questions case
  if (questions.length === 0) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>No Quiz Available</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-4">
              No quiz questions are available for this module yet.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Quiz Results</DialogTitle>
          </DialogHeader>

          <div className="py-6 text-center">
            {passed ? (
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
            )}
            
            <h3 className="text-3xl font-bold mb-2">
              {score}/{questions.length}
            </h3>
            <p className="text-xl text-muted-foreground mb-6">
              {percentage}% - {passed ? "Passed! 🎉" : "Keep trying!"}
            </p>

            {passed && rewardAmount > 0 && (
              <Card className="p-6 bg-primary/5 border-primary/20 mb-6">
                <Trophy className="h-12 w-12 text-primary mx-auto mb-3" />
                <p className="text-lg font-semibold mb-2">NCTR Reward Earned!</p>
                <p className="text-3xl font-bold text-primary mb-2">
                  {rewardAmount.toFixed(2)} NCTR
                </p>
                <p className="text-sm text-muted-foreground">
                  Locked in {module.lock_type}
                </p>
              </Card>
            )}

            <div className="space-y-3">
              {passed ? (
                <Button onClick={handleFinish} className="w-full" size="lg">
                  Complete Module
                </Button>
              ) : (
                <>
                  <Button onClick={handleRetry} className="w-full" size="lg">
                    Try Again
                  </Button>
                  <Button onClick={onClose} variant="outline" className="w-full">
                    Close
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{module.title} - Quiz</DialogTitle>
          <DialogDescription>
            Answer all questions correctly to earn {module.nctr_reward} NCTR
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">{currentQ.question_text}</h3>
          
          <RadioGroup
            value={answers[currentQ.id] || ""}
            onValueChange={(value) => handleAnswerSelect(currentQ.id, value)}
          >
            {currentQ.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label
                  htmlFor={`option-${index}`}
                  className="flex-1 cursor-pointer p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            variant="outline"
          >
            Previous
          </Button>

          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!answers[currentQ.id]}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || Object.keys(answers).length < questions.length}
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
