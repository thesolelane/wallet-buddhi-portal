import { Header } from '../Header';
import { ThemeProvider } from '@/lib/theme-provider';
import { useState } from 'react';

export default function HeaderExample() {
  const [connected, setConnected] = useState(false);
  
  return (
    <ThemeProvider>
      <Header 
        onConnectWallet={() => setConnected(!connected)}
        walletConnected={connected}
        walletAddress={connected ? "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" : undefined}
        currentTier="pro"
      />
    </ThemeProvider>
  );
}
