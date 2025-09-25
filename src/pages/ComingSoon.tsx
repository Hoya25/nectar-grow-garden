import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import nctrLogo from "@/assets/nctr-logo.png";

const ComingSoon = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto bg-card/90 backdrop-blur-sm border-border/50">
        <CardContent className="p-8 text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src={nctrLogo} 
              alt="NCTR Logo" 
              className="h-16 w-auto"
            />
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
              The Garden
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
              Coming Soon
            </h2>
          </div>

          {/* Description */}
          <div className="space-y-4 text-muted-foreground">
            <p className="text-lg">
              We're putting the finishing touches on something amazing.
            </p>
            <p className="text-base">
              The Garden will be your gateway to earning everyday crypto rewards through our innovative ecosystem. 
              Stay tuned for the launch!
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <Button 
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3"
              onClick={() => window.open('https://www.nctr.live', '_blank')}
            >
              Back to NCTR.Live
            </Button>
          </div>

          {/* Footer Text */}
          <div className="pt-8 border-t border-border/20">
            <p className="text-sm text-muted-foreground">
              Thank you for your interest in The Garden
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoon;