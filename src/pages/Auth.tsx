import { useState, useEffect } from 'react';
import SEOHead from '@/components/SEOHead';
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
import WalletConnection from '@/components/WalletConnection';

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
    <div className="min-h-screen bg-gradient-page flex flex-col">
      <SEOHead title="Sign In | The Garden" description="Sign in or create your account to start earning NCTR on every purchase." canonicalPath="/auth" />
      {/* Header with logo and back link */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-transparent hover:opacity-80 transition-opacity"
          >
            <svg className="h-7 w-7" viewBox="0 0 434 434" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="217" cy="217" r="200" stroke="#323232" strokeWidth="16" fill="none"/>
              <path d="M130.444 309.52C128.745 309.52 127.279 308.902 126.044 307.667C124.809 306.432 124.191 304.965 124.191 303.267V209.485C124.191 207.787 124.809 206.32 126.044 205.085C127.279 203.85 128.745 203.233 130.444 203.233H161.473C163.325 203.233 164.483 202.461 164.946 200.917C165.101 200.609 165.178 200.145 165.178 199.528C165.178 198.447 164.869 197.598 164.252 196.981C159.62 192.504 154.603 187.564 149.2 182.161C143.797 176.603 138.548 171.355 133.454 166.415L126.044 158.773C124.809 157.538 124.191 156.072 124.191 154.373V130.523C124.191 128.825 124.809 127.358 126.044 126.123C127.279 124.888 128.745 124.271 130.444 124.271H154.294C155.992 124.271 157.459 124.888 158.694 126.123L256.876 224.073C257.648 224.845 258.497 225.231 259.423 225.231C260.504 225.231 261.353 224.845 261.97 224.073C262.742 223.302 263.128 222.452 263.128 221.526V187.254C263.128 185.556 263.039 177.682 263.039 177.682C263.039 177.682 262.719 174.55 264.676 172.629C266.455 170.778 268.468 170.565 269.373 170.565H301.897C306.063 170.565 309.44 173.942 309.44 178.109V185.332V224.305C309.44 226.003 308.823 227.47 307.588 228.705C306.353 229.94 304.886 230.557 303.188 230.557H272.159C270.307 230.557 269.149 231.329 268.686 232.873C268.531 233.181 268.454 233.645 268.454 234.262C268.454 235.343 268.763 236.192 269.38 236.809C274.012 241.286 279.029 246.303 284.432 251.861C289.835 257.264 295.084 262.435 300.178 267.375L307.588 275.017C308.823 276.252 309.44 277.718 309.44 279.417V303.267C309.44 304.965 308.823 306.432 307.588 307.667C306.353 308.902 304.886 309.52 303.188 309.52H279.337C277.639 309.52 276.173 308.902 274.938 307.667L176.756 209.717C175.984 208.945 175.135 208.559 174.209 208.559C173.128 208.559 172.202 208.945 171.43 209.717C170.812 210.488 170.504 211.338 170.504 212.264V303.267C170.504 304.965 169.886 306.432 168.651 307.667C167.416 308.902 165.95 309.52 164.252 309.52H130.444Z" fill="#323232"/>
            </svg>
            <span className="text-base font-bold text-[#323232]">The Garden</span>
          </button>
          <Button
            variant="ghost"
            onClick={() => navigate('/garden')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to The Garden
          </Button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <WalletConnection />
        
        <Card className="bg-card/90 backdrop-blur-sm shadow-elegant">
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
                    🎉 You're signing up with a referral code! You and your referrer will both earn {inviteReward} NCTR in 360LOCK after you <strong>complete your profile and make your first purchase</strong> through The Garden.
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
      </div>
    </div>
  );
};

export default Auth;