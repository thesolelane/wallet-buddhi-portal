import { Shield, Twitter, Github, Mail } from "lucide-react";
import { SiDiscord, SiSolana } from "react-icons/si";

export function Footer() {
  const socialLinks = [
    { label: "GitHub", icon: Github, href: "#", testId: "link-github" },
    { label: "Twitter", icon: Twitter, href: "#", testId: "link-twitter" },
    { label: "Discord", icon: SiDiscord, href: "#", testId: "link-discord" },
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
            <p className="text-xs text-muted-foreground pt-2">
              A partner of{" "}
              <a
                href="https://cooperanth.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors underline"
                data-testid="link-cooperanth"
              >
                Cooperanth Consulting LLC
              </a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#pricing" className="hover:text-foreground transition-colors" data-testid="link-pricing">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors" data-testid="link-features">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors" data-testid="link-faq">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors" data-testid="link-about">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors" data-testid="link-careers">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors" data-testid="link-contact">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal & Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li>
                <a
                  href="https://cooperanth.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                  data-testid="link-privacy"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="https://cooperanth.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                  data-testid="link-terms"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors" data-testid="link-support">
                  Support
                </a>
              </li>
            </ul>
            <div className="flex gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="p-2 rounded-lg bg-muted hover-elevate active-elevate-2 transition-all"
                  aria-label={link.label}
                  data-testid={link.testId}
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
