import { Button } from '@/components/ui/button';
import { RefreshCw, Zap } from 'lucide-react';
import { useNCTRSync } from '@/hooks/useNCTRSync';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface NCTRSyncButtonProps {
  variant?: 'button' | 'card';
  className?: string;
}

export const NCTRSyncButton = ({ variant = 'button', className }: NCTRSyncButtonProps) => {
  const { syncPortfolio, syncing } = useNCTRSync();

  const handleSync = () => {
    syncPortfolio();
  };

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            NCTR Live Sync
          </CardTitle>
          <CardDescription>
            Sync your portfolio with token.nctr.live to update your Wings status and balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleSync} 
            disabled={syncing}
            className="w-full"
            variant="outline"
          >
            {syncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Portfolio
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button 
      onClick={handleSync} 
      disabled={syncing}
      variant="outline"
      className={className}
    >
      {syncing ? (
        <>
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync NCTR Live
        </>
      )}
    </Button>
  );
};