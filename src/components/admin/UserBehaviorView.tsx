import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar,
  Flame,
  BookOpen,
  MousePointer,
  Activity,
  Globe,
  CheckCircle,
  XCircle,
  Award,
  Clock,
  Shield
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface CheckinStreak {
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  last_checkin_date: string | null;
  streak_bonuses_earned: number;
}

interface LearningProgress {
  module_id: string;
  module_title: string;
  status: string;
  content_viewed: boolean;
  quiz_passed: boolean;
  quiz_score: number | null;
  reward_claimed: boolean;
  reward_amount: number | null;
  started_at: string | null;
  completed_at: string | null;
}

interface AffiliateClick {
  id: string;
  platform_name: string;
  clicked_at: string;
  referrer: string | null;
}

interface RecentActivity {
  platform: string;
  action_type: string;
  action_data: Record<string, unknown>;
  created_at: string;
}

interface SessionInfo {
  signup_ip: string | null;
  last_login_ip: string | null;
  nctr_live_verified: boolean | null;
  nctr_live_email: string | null;
  account_status: string | null;
}

interface UserBehaviorData {
  checkin_streak: CheckinStreak | null;
  learning_progress: LearningProgress[];
  affiliate_clicks: AffiliateClick[];
  recent_activity: RecentActivity[];
  session_info: SessionInfo | null;
}

interface UserBehaviorViewProps {
  userId: string;
}

const UserBehaviorView = ({ userId }: UserBehaviorViewProps) => {
  const [behaviorData, setBehaviorData] = useState<UserBehaviorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'streaks' | 'learning' | 'clicks' | 'activity'>('streaks');

  useEffect(() => {
    if (userId) {
      fetchBehaviorData();
    }
  }, [userId]);

  const fetchBehaviorData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_admin_user_behavior', { target_user_id: userId });

      if (error) {
        console.error('Error fetching behavior data:', error);
        toast({
          title: "Error",
          description: "Failed to load user behavior data.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setBehaviorData(data as unknown as UserBehaviorData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!behaviorData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No behavior data available</p>
        </CardContent>
      </Card>
    );
  }

  const { checkin_streak, learning_progress, affiliate_clicks, recent_activity, session_info } = behaviorData;

  return (
    <div className="space-y-6">
      {/* Session & Account Info Banner */}
      {session_info && (
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Account Status</div>
                  <Badge variant={session_info.account_status === 'active' ? 'default' : 'destructive'}>
                    {session_info.account_status || 'active'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Signup IP</div>
                  <div className="font-mono text-xs">{session_info.signup_ip || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Last Login IP</div>
                  <div className="font-mono text-xs">{session_info.last_login_ip || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {session_info.nctr_live_verified ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                )}
                <div>
                  <div className="text-xs text-muted-foreground">NCTR Live</div>
                  <div className="text-sm">{session_info.nctr_live_verified ? 'Verified' : 'Not Verified'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeSection === 'streaks' ? 'default' : 'outline'}
          onClick={() => setActiveSection('streaks')}
          className="flex items-center gap-2"
        >
          <Flame className="w-4 h-4" />
          Check-in Streaks
        </Button>
        <Button
          variant={activeSection === 'learning' ? 'default' : 'outline'}
          onClick={() => setActiveSection('learning')}
          className="flex items-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Learning ({learning_progress?.length || 0})
        </Button>
        <Button
          variant={activeSection === 'clicks' ? 'default' : 'outline'}
          onClick={() => setActiveSection('clicks')}
          className="flex items-center gap-2"
        >
          <MousePointer className="w-4 h-4" />
          Affiliate Clicks ({affiliate_clicks?.length || 0})
        </Button>
        <Button
          variant={activeSection === 'activity' ? 'default' : 'outline'}
          onClick={() => setActiveSection('activity')}
          className="flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          Activity Log ({recent_activity?.length || 0})
        </Button>
      </div>

      {/* Check-in Streaks Section */}
      {activeSection === 'streaks' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Daily Check-in Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checkin_streak ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">{checkin_streak.current_streak}</div>
                  <div className="text-sm text-muted-foreground">Current Streak</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{checkin_streak.longest_streak}</div>
                  <div className="text-sm text-muted-foreground">Longest Streak</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{checkin_streak.total_checkins}</div>
                  <div className="text-sm text-muted-foreground">Total Check-ins</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{checkin_streak.streak_bonuses_earned}</div>
                  <div className="text-sm text-muted-foreground">Bonuses Earned</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-lg font-medium">
                    {checkin_streak.last_checkin_date 
                      ? format(new Date(checkin_streak.last_checkin_date), 'MMM dd, yyyy')
                      : 'Never'}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Check-in</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No check-in streak data</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Learning Progress Section */}
      {activeSection === 'learning' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              Learning Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {learning_progress && learning_progress.length > 0 ? (
              <div className="space-y-4">
                {learning_progress.map((progress, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {progress.quiz_passed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : progress.content_viewed ? (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">{progress.module_title || 'Unknown Module'}</div>
                        <div className="text-sm text-muted-foreground">
                          Status: {progress.status}
                          {progress.started_at && (
                            <> • Started: {format(new Date(progress.started_at), 'MMM dd, yyyy')}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {progress.quiz_score !== null && (
                        <div className="font-bold text-primary">Score: {progress.quiz_score}%</div>
                      )}
                      {progress.reward_claimed && progress.reward_amount && (
                        <Badge className="bg-green-100 text-green-700">
                          <Award className="w-3 h-3 mr-1" />
                          +{progress.reward_amount} NCTR
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No learning progress found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Affiliate Clicks Section */}
      {activeSection === 'clicks' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-purple-500" />
              Affiliate Link Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {affiliate_clicks && affiliate_clicks.length > 0 ? (
              <div className="space-y-3">
                {affiliate_clicks.map((click) => (
                  <div key={click.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MousePointer className="w-4 h-4 text-purple-500" />
                      <div>
                        <div className="font-medium">{click.platform_name}</div>
                        {click.referrer && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            From: {click.referrer}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(click.clicked_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MousePointer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No affiliate clicks found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity Log Section */}
      {activeSection === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              Cross-Platform Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent_activity && recent_activity.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recent_activity.map((activity, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Globe className="w-4 h-4 text-blue-500 mt-1" />
                      <div>
                        <div className="font-medium capitalize">{activity.action_type.replace(/_/g, ' ')}</div>
                        <Badge variant="outline" className="text-xs">
                          {activity.platform}
                        </Badge>
                        {activity.action_data && Object.keys(activity.action_data).length > 0 && (
                          <pre className="text-xs text-muted-foreground mt-1 max-w-[300px] overflow-x-auto">
                            {JSON.stringify(activity.action_data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No activity log found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserBehaviorView;
