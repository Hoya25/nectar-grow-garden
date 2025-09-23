import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User, Mail, Camera, Wallet, Edit, Gift } from 'lucide-react';
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
      label: 'Add Full Name',
      icon: User,
      completed: completionData.completion_details.full_name,
    },
    {
      key: 'username',
      label: 'Set Username',
      icon: User,
      completed: completionData.completion_details.username,
    },
    {
      key: 'email',
      label: 'Verify Email',
      icon: Mail,
      completed: completionData.completion_details.email,
    },
    {
      key: 'wallet_connected',
      label: 'Connect Wallet',
      icon: Wallet,
      completed: completionData.completion_details.wallet_connected,
    },
    {
      key: 'avatar_url',
      label: 'Upload Profile Picture',
      icon: Camera,
      completed: completionData.completion_details.avatar_url,
    },
  ];

  const completedTasks = completionItems.filter(item => item.completed).length;
  const totalTasks = completionItems.length;

  const handleCompleteProfile = () => {
    navigate('/profile');
  };

  const handleClaimBonus = async () => {
    await awardBonus();
  };

  return (
    <Card className="p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {isComplete ? '🎉 Profile Complete!' : '📝 Complete Your Profile'}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            {isComplete 
              ? 'Your profile is 100% complete!' 
              : `Complete ${totalTasks - completedTasks} remaining tasks to earn your bounty`
            }
          </p>
          
          {/* Profile Setup Bounty */}
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Profile Setup Bounty:</span>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">
              500 NCTR
            </Badge>
          </div>
        </div>
        
        <Badge variant="outline" className="ml-4">
          {completedTasks}/{totalTasks} Complete
        </Badge>
      </div>

      {/* Task List */}
      <div className="space-y-2 mb-4">
        {completionItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                item.completed 
                  ? 'bg-green-50 dark:bg-green-950/30' 
                  : 'bg-gray-50 dark:bg-gray-900/30'
              }`}
            >
              <div className="relative flex-shrink-0">
                <Icon className={`h-4 w-4 ${item.completed ? 'text-green-600' : 'text-gray-400'}`} />
                {item.completed && (
                  <CheckCircle className="h-3 w-3 text-green-600 absolute -top-1 -right-1" />
                )}
              </div>
              <span className={`text-sm font-medium flex-1 ${
                item.completed ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'
              }`}>
                {item.label}
              </span>
              <Badge 
                variant={item.completed ? "default" : "secondary"}
                className={item.completed ? 'bg-green-100 text-green-700' : ''}
              >
                {item.completed ? 'Done' : 'Pending'}
              </Badge>
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