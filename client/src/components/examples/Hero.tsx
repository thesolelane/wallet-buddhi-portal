import { Hero } from '../Hero';
import { ThemeProvider } from '@/lib/theme-provider';

export default function HeroExample() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <Hero onGetStarted={() => console.log('Get started clicked')} />
      </div>
    </ThemeProvider>
  );
}
