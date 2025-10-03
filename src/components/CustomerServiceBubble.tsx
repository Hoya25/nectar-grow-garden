import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

declare global {
  interface Window {
    tidioChatApi?: {
      open: () => void;
      hide: () => void;
      display: (show: boolean) => void;
    };
  }
}

export const CustomerServiceBubble = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChat = () => {
    // Open Tidio chat widget
    if (window.tidioChatApi) {
      console.log('Opening Tidio chat...');
      window.tidioChatApi.display(true);
      window.tidioChatApi.open();
      setIsOpen(false);
    } else {
      console.error('Tidio chat API not available yet');
      // Fallback: wait a moment and try again
      setTimeout(() => {
        if (window.tidioChatApi) {
          window.tidioChatApi.display(true);
          window.tidioChatApi.open();
          setIsOpen(false);
        } else {
          console.error('Tidio still not loaded after retry');
        }
      }, 1000);
    }
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      <div className="fixed bottom-6 right-6 z-50">
        {isOpen && (
          <Card className="mb-3 w-64 shadow-xl animate-scale-in">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-sm">Need Help?</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Have questions about NCTR or The Garden? We're here to help!
              </p>
              <Button
                size="sm"
                className="w-full"
                onClick={handleOpenChat}
              >
                Contact Support
              </Button>
            </CardContent>
          </Card>
        )}
        
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all hover:scale-110"
          onClick={() => setIsOpen(!isOpen)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    </>
  );
};
