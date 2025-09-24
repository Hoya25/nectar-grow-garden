import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Link, Store, TrendingUp } from 'lucide-react';
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
                  <li>Add your existing affiliate URL (like Ledger's)</li>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliateLinks;