import { useEffect, useState } from "react";
import { Clock, Flame } from "lucide-react";
import { useDailyCheckinStreak } from "@/hooks/useDailyCheckinStreak";
import { Progress } from "@/components/ui/progress";

interface DailyCheckinCountdownProps {
  className?: string;
  onComplete?: () => void;
  lastCheckinTime?: string | null;
}

export const DailyCheckinCountdown = ({
  className = "",
  onComplete,
  lastCheckinTime,
}: DailyCheckinCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const { streakData, streakConfig, getDaysUntilNextBonus, getStreakProgress } = useDailyCheckinStreak();

  const calculateTimeUntilNextCheckin = () => {
    const now = new Date();
    let targetTime: Date;

    if (lastCheckinTime) {
      const lastCheckin = new Date(lastCheckinTime);
      targetTime = new Date(lastCheckin.getTime() + 24 * 60 * 60 * 1000);
    } else {
      targetTime = new Date(now);
      targetTime.setHours(24, 0, 0, 0);
    }

    const diff = targetTime.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / 1000));
  };

  useEffect(() => {
    const updateCountdown = () => {
      const seconds = calculateTimeUntilNextCheckin();
      setTimeLeft(seconds);

      if (seconds === 0) {
        onComplete?.();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [onComplete, lastCheckinTime]);

  if (timeLeft <= 0) {
    return null;
  }

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const daysUntilBonus = getDaysUntilNextBonus();
  const streakProgress = getStreakProgress();

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Countdown Timer */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <Clock className="w-4 h-4" />
        {timeLeft < 60 ? (
          <span className="text-orange-500 font-medium">
            Less than a minute until next check-in!
          </span>
        ) : timeLeft < 3600 ? (
          <span>
            Next check-in in{" "}
            <span className="font-medium text-primary">{minutes}</span>{" "}
            {minutes === 1 ? "minute" : "minutes"}
          </span>
        ) : (
          <span>
            Next check-in in{" "}
            <span className="font-medium text-primary">{hours}</span>{" "}
            {hours === 1 ? "hour" : "hours"} and{" "}
            <span className="font-medium text-primary">{minutes}</span>{" "}
            {minutes === 1 ? "minute" : "minutes"}
          </span>
        )}
      </div>

      {/* Streak Progress */}
      {streakConfig?.enabled && streakData && streakData.current_streak > 0 && (
        <div className="space-y-2 p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-medium">
                {streakData.current_streak} Day Streak
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {daysUntilBonus} days to bonus
            </span>
          </div>
          <Progress value={streakProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {streakConfig.streak_bonus_description}
          </p>
        </div>
      )}
    </div>
  );
};
