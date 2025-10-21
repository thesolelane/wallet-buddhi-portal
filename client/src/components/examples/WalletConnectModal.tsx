import { WalletConnectModal } from '../WalletConnectModal';
import { ThemeProvider } from '@/lib/theme-provider';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function WalletConnectModalExample() {
  const [open, setOpen] = useState(false);
  
  return (
    <ThemeProvider>
      <div className="p-8">
        <Button onClick={() => setOpen(true)}>Open Wallet Connect</Button>
        <WalletConnectModal
          open={open}
          onOpenChange={setOpen}
          onConnect={(wallet) => console.log('Connected to', wallet)}
        />
      </div>
    </ThemeProvider>
  );
}
