import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Link, Store, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserAffiliateLinks from '@/components/UserAffiliateLinks';
import IndependentAffiliateLinks from '@/components/IndependentAffiliateLinks';

const AffiliateLinks = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/garden')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Garden
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Affiliate Links</h1>
            <p className="text-muted-foreground">
              Generate tracked affiliate links and earn NCTR rewards from purchases
            </p>
          </div>
        </div>

        {/* Critical Workflow Warning */}
        <Alert className="mb-6 border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-base">
            <div className="space-y-3">
              <p className="font-bold text-amber-900 dark:text-amber-100 text-lg">
                ⚠️ IMPORTANT: Generate Your Link BEFORE Shopping!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3 bg-white dark:bg-background rounded-lg p-3 border">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-bold">
                    1
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-1 flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      Generate Link First
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click "Generate Link" below for the brand you want to shop at
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white dark:bg-background rounded-lg p-3 border">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 font-bold">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-1 flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      Click Through Link
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use YOUR generated link to visit the store and complete purchase
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white dark:bg-background rounded-lg p-3 border">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 font-bold">
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-1 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Earn NCTR
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your purchase is tracked & you earn NCTR in 24-72 hours
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-red-100 dark:bg-red-950/30 rounded-lg p-3 border border-red-300 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-red-900 dark:text-red-100 text-sm">
                    ❌ Won't Work: Shopping directly at store without generating link first
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-900 dark:text-green-100 text-sm">
                    ✅ Will Work: Generate link → Click link → Shop → Get NCTR
                  </span>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Partner Brands</h3>
                  <p className="text-sm text-muted-foreground">Integrated shopping partners</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    API Integration
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Link className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Independent Links</h3>
                  <p className="text-sm text-muted-foreground">Any affiliate program</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    Link Wrapping
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Earn NCTR</h3>
                  <p className="text-sm text-muted-foreground">Track clicks & conversions</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    Automatic Rewards
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Affiliate Method</CardTitle>
            <p className="text-muted-foreground">
              Select between integrated partner brands or add your own affiliate links from any platform
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="independent" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="independent" className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Curated Links
                  <Badge variant="secondary" className="ml-1 text-xs">Available</Badge>
                </TabsTrigger>
                <TabsTrigger value="partners" className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Partner Brands
                  <Badge variant="outline" className="ml-1 text-xs">Limited</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="independent" className="mt-6">
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  🔗 Curated Affiliate Links
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  The Garden team has curated these affiliate partnerships. Each link includes automatic user tracking 
                  so you can earn NCTR rewards when people make purchases through your referrals.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Curated by Garden admins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Automatic click tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>User identification in URLs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Earn NCTR on conversions</span>
                  </div>
                </div>
              </div>
                  <IndependentAffiliateLinks />
                </div>
              </TabsContent>

              <TabsContent value="partners" className="mt-6">
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      🏪 Integrated Partner Brands
                    </h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                      Limited to brands with API integration through Loyalize. Automatic conversion tracking 
                      but fewer available partners.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>API-integrated brands only</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Automatic conversion tracking</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>Limited brand selection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>Requires partner cooperation</span>
                      </div>
                    </div>
                  </div>
                  <UserAffiliateLinks />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-8 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg">How Affiliate Link Tracking Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Independent Links Process:</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Add your existing affiliate URL (like Ledger&apos;s)</li>
                  <li>We create a tracked redirect link</li>
                  <li>Share the tracked link with your audience</li>
                  <li>Clicks are recorded with user identification</li>
                  <li>Report conversions to earn NCTR rewards</li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Example Enhanced URL:</h4>
                <div className="bg-background border rounded-lg p-3 text-xs font-mono">
                  <div className="text-muted-foreground mb-1">Original:</div>
                  <div className="mb-3">https://shop.ledger.com/?r=4c47a8c09777</div>
                  <div className="text-muted-foreground mb-1">Enhanced with tracking:</div>
                  <div className="break-all">
                    https://shop.ledger.com/?r=4c47a8c09777<br/>
                    <span className="text-primary">&nctr_user=abc123de&nctr_ref=xyz789</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Credit Timeline Section */}
            <div className="border-t pt-4 mt-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                When Will I Receive NCTR Credits?
              </h4>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-900 dark:text-amber-100 mb-3">
                  <strong>Typical Timeline: 24-72 hours</strong> after purchase confirmation
                </p>
                <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                  <p>
                    🔄 <strong>Why the wait?</strong> Merchants need to confirm orders and prevent fraud. 
                    Commission tracking systems report to us in batches, typically every 24-48 hours.
                  </p>
                  <p>
                    ⚡ <strong>Auto-sync:</strong> Once reported, NCTR is automatically credited to your account.
                    You&apos;ll see it appear in your transaction history.
                  </p>
                  <p>
                    ⚠️ <strong>Delays may occur if:</strong> Orders are cancelled, returned, or flagged for review.
                    Some merchants take 30-90 days to confirm large purchases.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliateLinks;