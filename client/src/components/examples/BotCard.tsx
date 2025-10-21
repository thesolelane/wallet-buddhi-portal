import { BotCard } from '../BotCard';
import { ThemeProvider } from '@/lib/theme-provider';

export default function BotCardExample() {
  return (
    <ThemeProvider>
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
        <BotCard
          id="bot-1"
          name="Cross-DEX Arbitrage"
          strategy="Jupiter ↔ Raydium"
          status="active"
          performance="+12.5%"
          onToggle={(active) => console.log('Bot toggled:', active)}
          onConfigure={() => console.log('Configure bot')}
        />
        <BotCard
          id="bot-2"
          name="Token Pair Monitor"
          strategy="SOL/USDC"
          status="inactive"
          onToggle={(active) => console.log('Bot toggled:', active)}
          onConfigure={() => console.log('Configure bot')}
        />
      </div>
    </ThemeProvider>
  );
}
