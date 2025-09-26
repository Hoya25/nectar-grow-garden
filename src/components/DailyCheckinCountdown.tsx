import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface DailyCheckinCountdownProps {
  className?: string;
  onComplete?: () => void;
  lastCheckinTime?: string | null; // ISO timestamp of user's last check-in
}

export const DailyCheckinCountdown = ({ className = "", onComplete, lastCheckinTime }: DailyCheckinCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });

  const calculateTimeUntilNextCheckin = () => {
    const now = new Date();
    let targetTime: Date;

    if (lastCheckinTime) {
      // Calculate 24 hours from the user's last check-in time
      const lastCheckin = new Date(lastCheckinTime);
      targetTime = new Date(lastCheckin.getTime() + (24 * 60 * 60 * 1000));
    } else {
      // Fallback to midnight if no last check-in time available
      targetTime = new Date(now);
      targetTime.setHours(24, 0, 0, 0);
    }
    
    const diff = targetTime.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  useEffect(() => {
    const updateCountdown = () => {
      const time = calculateTimeUntilNextCheckin();
      setTimeLeft(time);
      
      // If countdown reaches zero, call onComplete callback
      if (time.hours === 0 && time.minutes === 0 && time.seconds === 0) {
        onComplete?.();
      }
    };

    // Update immediately
    updateCountdown();
    
    // Update every second
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [onComplete, lastCheckinTime]);

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  const isLessThanHour = timeLeft.hours === 0;
  const isLessThanMinute = timeLeft.hours === 0 && timeLeft.minutes === 0;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Clock className="w-3 h-3" />
      <span className="font-mono text-xs">
        {isLessThanHour ? (
          isLessThanMinute ? (
            // Less than a minute - show seconds only
            <span className="text-orange-600">
              {formatTime(timeLeft.seconds)}s
            </span>
          ) : (
            // Less than an hour - show minutes and seconds
            <span className="text-yellow-600">
              {formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
            </span>
          )
        ) : (
          // More than an hour - show full time
          `${formatTime(timeLeft.hours)}:${formatTime(timeLeft.minutes)}:${formatTime(timeLeft.seconds)}`
        )}
      </span>
    </div>
  );
};