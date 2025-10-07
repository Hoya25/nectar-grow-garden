import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useInviteReward } from '@/hooks/useInviteReward';
import { Loader2 } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('signin');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [manualReferralCode, setManualReferralCode] = useState('');
  const [hasPendingPurchase, setHasPendingPurchase] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const { signUp, signIn, user } = useAuth();
  const { inviteReward } = useInviteReward();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for pending purchase
    const pendingPurchaseStr = sessionStorage.getItem('pendingPurchase');
    if (pendingPurchaseStr) {
      setHasPendingPurchase(true);
    }
    
    // Check for referral code in URL on component mount
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
      setReferralCode(refParam);
      setActiveTab('signup'); // Switch to signup tab if there's a referral code
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Check for pending purchase info
      const pendingPurchaseStr = sessionStorage.getItem('pendingPurchase');
      if (pendingPurchaseStr) {
        try {
          const pendingPurchase = JSON.parse(pendingPurchaseStr);
          sessionStorage.removeItem('pendingPurchase');
          // Don't show toast here - let Garden page handle it
        } catch (e) {
          console.error('Error parsing pending purchase:', e);
        }
      }

      // Check if there's a redirect URL in the query params or session storage
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get('redirect') || sessionStorage.getItem('authRedirect') || '/garden';
      
      // Clear stored redirect
      sessionStorage.removeItem('authRedirect');
      
      console.log('User authenticated, redirecting to:', redirectTo);
      navigate(redirectTo);
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const finalReferralCode = referralCode || (manualReferralCode.trim() || null);
    const { error } = await signUp(email, password, fullName, finalReferralCode);
    
    if (error) {
      setError(error.message);
    } else {
      setError('Check your email for the confirmation link!');
    }
    
    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    
    if (error) {
      setError(error.message);
    } else {
      setResetSuccess(true);
      setError('Password reset email sent! Check your inbox.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-page flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/90 backdrop-blur-sm shadow-elegant">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            {hasPendingPurchase ? '🎉 Purchase Successful!' : 'Welcome to The Garden'}
          </CardTitle>
          <CardDescription>
            {hasPendingPurchase 
              ? 'Please sign in to complete your NCTR purchase and see it in your portfolio'
              : 'Join our community and start earning NCTR tokens'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              {!showPasswordReset ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowPasswordReset(true)}
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-white border-2 border-primary text-foreground hover:bg-section-highlight"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-white border-2 border-primary text-foreground hover:bg-section-highlight"
                    disabled={loading || resetSuccess}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {resetSuccess ? 'Email Sent!' : 'Send Reset Link'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setShowPasswordReset(false);
                      setResetSuccess(false);
                      setError(null);
                    }}
                  >
                    Back to Sign In
                  </Button>
                </form>
              )}
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              {(referralCode || manualReferralCode.trim()) && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">
                    🎉 You're signing up with a referral code! You and your referrer will both earn {inviteReward} NCTR when you complete signup.
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-fullname">Full Name</Label>
                  <Input
                    id="signup-fullname"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                
                {!referralCode && (
                  <div className="space-y-2">
                    <Label htmlFor="referral-code">Referral Code (Optional)</Label>
                    <Input
                      id="referral-code"
                      type="text"
                      placeholder="Enter referral code"
                      value={manualReferralCode}
                      onChange={(e) => setManualReferralCode(e.target.value)}
                    />
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full bg-white border-2 border-primary text-foreground hover:bg-section-highlight"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {error && (
            <Alert className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;