import { FeatureCard } from '../FeatureCard';
import { ThemeProvider } from '@/lib/theme-provider';
import { Shield, Brain, Bot, Zap } from 'lucide-react';

export default function FeatureCardExample() {
  return (
    <ThemeProvider>
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FeatureCard
          icon={Shield}
          title="AI Protection"
          description="Advanced threat detection powered by Deep3 Labs"
          iconColor="text-chart-3"
        />
        <FeatureCard
          icon={Brain}
          title="Smart Analysis"
          description="Real-time risk scoring for every transaction"
          iconColor="text-chart-1"
        />
        <FeatureCard
          icon={Bot}
          title="Arbitrage Bots"
          description="Automated trading across Solana DEXs"
          iconColor="text-chart-2"
        />
        <FeatureCard
          icon={Zap}
          title="Lightning Fast"
          description="Monitor your wallet with zero latency"
          iconColor="text-chart-4"
        />
      </div>
    </ThemeProvider>
  );
}
