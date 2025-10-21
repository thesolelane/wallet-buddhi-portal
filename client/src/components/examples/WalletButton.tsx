import { WalletButton } from '../WalletButton';
import { useState } from 'react';

export default function WalletButtonExample() {
  const [connected, setConnected] = useState(false);
  
  return (
    <div className="p-4 space-y-4">
      <WalletButton 
        onConnect={() => setConnected(!connected)}
        connected={connected}
        address={connected ? "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" : undefined}
      />
    </div>
  );
}
