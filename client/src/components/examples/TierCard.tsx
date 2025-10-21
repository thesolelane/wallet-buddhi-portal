import { TierCard } from '../TierCard';
import { ThemeProvider } from '@/lib/theme-provider';

export default function TierCardExample() {
  return (
    <ThemeProvider>
      <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
        <TierCard
          name="Basic"
          price="Free"
          description="Essential wallet protection"
          features={[
            "Local spam classifier",
            "Real-time monitoring",
            "Basic threat detection",
            "Transaction alerts"
          ]}
          current
          onUpgrade={() => console.log('Upgrade to Basic')}
        />
        <TierCard
          name="Pro"
          price="$9.99"
          priceInCath="50 $CATH"
          description="Advanced AI protection"
          features={[
            "Everything in Basic",
            "Deep3 Labs AI analysis",
            "Advanced risk scoring",
            "Priority support"
          ]}
          popular
          onUpgrade={() => console.log('Upgrade to Pro')}
        />
        <TierCard
          name="Pro+"
          price="$29.99"
          priceInCath="100 $CATH"
          description="Full automation suite"
          features={[
            "Everything in Pro",
            "Up to 5 arbitrage bots",
            "MEV protection",
            "Custom strategies"
          ]}
          onUpgrade={() => console.log('Upgrade to Pro+')}
        />
      </div>
    </ThemeProvider>
  );
}
