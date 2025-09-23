import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, User, Mail, Camera, Wallet, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileCompletionBannerProps {
  showOnComplete?: boolean;
}

export const ProfileCompletionBanner = ({ showOnComplete = false }: ProfileCompletionBannerProps) => {
  const { completionData, completionScore, isComplete, eligibleForBonus, awardBonus } = useProfileCompletion();
  const navigate = useNavigate();

  // Don't show if complete and showOnComplete is false
  if (isComplete && !showOnComplete) return null;

  // Don't render if no data yet
  if (!completionData) return null;

  const completionItems = [
    {
      key: 'full_name',
      label: 'Full Name',
      icon: User,
      points: 25,
      completed: completionData.completion_details.full_name,
    },
    {
      key: 'username',
      label: 'Username',
      icon: User,
      points: 25,
      completed: completionData.completion_details.username,
    },
    {
      key: 'email',
      label: 'Email',
      icon: Mail,
      points: 20,
      completed: completionData.completion_details.email,
    },
    {
      key: 'wallet_connected',
      label: 'Wallet Connected',
      icon: Wallet,
      points: 15,
      completed: completionData.completion_details.wallet_connected,
    },
    {
      key: 'avatar_url',
      label: 'Profile Picture',
      icon: Camera,
      points: 10,
      completed: completionData.completion_details.avatar_url,
    },
  ];

  const handleCompleteProfile = () => {
    navigate('/profile');
  };

  const handleClaimBonus = async () => {
    await awardBonus();
  };

  return (
    <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {isComplete ? '🎉 Profile Complete!' : '📝 Complete Your Profile'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isComplete 
              ? 'Your profile is 100% complete!' 
              : 'Earn 500 NCTR by completing your profile'
            }
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{completionScore}%</div>
          <div className="text-sm text-muted-foreground">Complete</div>
        </div>
      </div>

      <Progress value={completionScore} className="mb-4" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {completionItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                item.completed 
                  ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' 
                  : 'bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5 mb-1" />
                {item.completed && (
                  <CheckCircle className="h-3 w-3 text-green-600 absolute -top-1 -right-1" />
                )}
              </div>
              <span className="text-xs text-center font-medium">{item.label}</span>
              <span className="text-xs opacity-75">+{item.points}pts</span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        {eligibleForBonus ? (
          <Button 
            onClick={handleClaimBonus}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            🎁 Claim 500 NCTR Bonus
          </Button>
        ) : !isComplete ? (
          <Button onClick={handleCompleteProfile} className="flex-1">
            <Edit className="h-4 w-4 mr-2" />
            Complete Profile
          </Button>
        ) : (
          <div className="flex-1 text-center py-2 text-green-600 font-medium">
            ✅ Bonus Already Claimed
          </div>
        )}
      </div>
    </Card>
  );
};