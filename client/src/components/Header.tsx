import { LayoutDashboard, BookOpen, HelpCircle, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { WalletButton } from "./WalletButton-new";
import { ThemeToggle } from "./ThemeToggle";
import { TierBadge } from "./TierBadge";
import { MobileNav } from "./MobileNav";
import { useWallet } from "@/lib/wallet-context-new";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";
import logoImage from "@assets/ChatGPT Image Oct 20, 2025, 01_13_52 PM (1)_1761084038488.png";

export function Header() {
  const [location, navigate] = useLocation();
  const { connected, tier } = useWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MobileNav connected={connected} />
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-2 py-1 -ml-2"
              data-testid="button-home"
            >
              <img 
                src={logoImage} 
                alt="Wallet Buddhi Logo" 
                className="h-8 w-8 md:h-10 md:w-10 object-contain bg-transparent"
              />
              <div className="flex flex-col">
                <span className="font-bold text-base md:text-lg">Wallet Buddhi</span>
                <span className="text-xs text-muted-foreground font-mono hidden sm:block">
                  wbuddhi.cooperanth.sol
                </span>
              </div>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {connected && location !== "/dashboard" && (
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                data-testid="link-dashboard"
                className="hover-elevate active-elevate-2"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            )}
            
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="hover-elevate active-elevate-2" data-testid="button-help-menu">
                    Help
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-2 p-4">
                      <li>
                        <NavigationMenuLink asChild>
                          <button
                            onClick={() => navigate("/getting-started")}
                            className="flex items-start gap-3 rounded-md p-3 w-full hover-elevate active-elevate-2 text-left"
                            data-testid="link-getting-started"
                          >
                            <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <div className="font-semibold mb-1">Getting Started</div>
                              <p className="text-sm text-muted-foreground">
                                Learn how to connect your wallet and use Wallet Buddhi
                              </p>
                            </div>
                          </button>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <button
                            onClick={() => navigate("/security")}
                            className="flex items-start gap-3 rounded-md p-3 w-full hover-elevate active-elevate-2 text-left"
                            data-testid="link-security"
                          >
                            <Shield className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <div className="font-semibold mb-1">Security Best Practices</div>
                              <p className="text-sm text-muted-foreground">
                                Essential tips to keep your wallet safe
                              </p>
                            </div>
                          </button>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <button
                            onClick={() => navigate("/faq")}
                            className="flex items-start gap-3 rounded-md p-3 w-full hover-elevate active-elevate-2 text-left"
                            data-testid="link-faq"
                          >
                            <HelpCircle className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <div className="font-semibold mb-1">FAQ</div>
                              <p className="text-sm text-muted-foreground">
                                Answers to commonly asked questions
                              </p>
                            </div>
                          </button>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {connected && <TierBadge tier={tier} />}
            <WalletButton />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
