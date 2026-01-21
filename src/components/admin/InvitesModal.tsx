import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Award, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ReferralData {
  id: string;
  referrer_id: string;
  referred_id: string;
  created_at: string;
  is_paid: boolean;
  referral_bonus: number;
  referrer_name: string;
  referred_name: string;
}

interface InvitesModalProps {
  children: React.ReactNode;
}

const InvitesModal = ({ children }: InvitesModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReferralDetails = async () => {
    if (!isOpen) return;
    
    setLoading(true);
    try {
      // Get successful referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('is_paid', true)
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;

      if (referralsData && referralsData.length > 0) {
        // Get safe profile names for referrers and referees using secure function
        const referrerIds = [...new Set(referralsData.map(r => r.referrer_id))];
        const referredIds = [...new Set(referralsData.map(r => r.referred_id))];
        
        // Fetch profiles using the secure function for admin use
        const referrerPromises = referrerIds.map(async (userId) => {
          const { data, error } = await supabase
            .rpc('get_safe_referral_profile', { target_user_id: userId });
          return { userId, profile: data?.[0] || null };
        });
        
        const referredPromises = referredIds.map(async (userId) => {
          const { data, error } = await supabase
            .rpc('get_safe_referral_profile', { target_user_id: userId });
          return { userId, profile: data?.[0] || null };
        });

        const [referrerProfiles, referredProfiles] = await Promise.all([
          Promise.all(referrerPromises),
          Promise.all(referredPromises)
        ]);

        // Create profile lookup map with secure data only
        const profileMap = new Map();
        
        [...referrerProfiles, ...referredProfiles].forEach(({ userId, profile }) => {
          if (profile) {
            profileMap.set(userId, profile.full_name || profile.username || 'Member');
          }
        });

        // Combine referrals with names (no sensitive data exposed)
        const enrichedReferrals: ReferralData[] = referralsData.map(referral => ({
          ...referral,
          referrer_name: profileMap.get(referral.referrer_id) || 'Member',
          referred_name: profileMap.get(referral.referred_id) || 'Member',
        }));

        setReferrals(enrichedReferrals);
      }
    } catch (error) {
      console.error('Error fetching referral details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralDetails();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Successful Invites ({referrals.length})
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading referral details...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {referrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No successful invites found.
              </div>
            ) : (
              <div className="grid gap-4">
                {referrals.map((referral) => (
                  <Card key={referral.id} className="bg-card/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          Referral #{referral.id.slice(0, 8)}
                        </CardTitle>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Completed
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">Referrer:</span>
                            <span className="text-sm text-foreground">
                              {referral.referrer_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium">New User:</span>
                            <span className="text-sm text-foreground">
                              {referral.referred_name}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Signup:</span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(referral.created_at), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Rewards:</span>
                          <Badge variant="outline" className="text-xs">
                            1000 NCTR each (360LOCK)
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InvitesModal;