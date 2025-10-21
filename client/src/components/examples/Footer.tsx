import { Footer } from '../Footer';
import { ThemeProvider } from '@/lib/theme-provider';

export default function FooterExample() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1" />
        <Footer />
      </div>
    </ThemeProvider>
  );
}
