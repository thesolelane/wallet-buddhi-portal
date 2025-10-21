import { Shield, Twitter, Github, FileText } from "lucide-react";
import { SiDiscord, SiSolana } from "react-icons/si";

export function Footer() {
  const links = [
    { label: "Documentation", icon: FileText, href: "#" },
    { label: "GitHub", icon: Github, href: "#" },
    { label: "Twitter", icon: Twitter, href: "#" },
    { label: "Discord", icon: SiDiscord, href: "#" },
  ];

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Wallet Buddhi</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Protect your Solana wallet with AI-powered security and automated trading.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <SiSolana className="h-4 w-4 text-primary" />
              <span className="font-mono text-muted-foreground">
                wbuddhi.cooperanth.sol
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Support</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Community</h4>
            <div className="flex gap-3">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="p-2 rounded-lg bg-muted hover-elevate active-elevate-2 transition-all"
                  aria-label={link.label}
                  data-testid={`link-${link.label.toLowerCase()}`}
                >
                  <link.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© 2025 Wallet Buddhi. Built on Solana. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
