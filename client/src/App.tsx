import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { SolanaProvider } from "@/lib/SolanaProvider";
import { WalletProvider } from "@/lib/wallet-context-new";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import GettingStarted from "@/pages/GettingStarted";
import FAQ from "@/pages/FAQ";
import Security from "@/pages/Security";
import Token from "@/pages/Token";
import Lab from "@/pages/Lab";
import Wallet from "@/pages/Wallet";
import BadActors from "@/pages/BadActors";
import Constellation from "@/pages/Constellation";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/getting-started" component={GettingStarted} />
      <Route path="/faq" component={FAQ} />
      <Route path="/security" component={Security} />
      <Route path="/token/:ca" component={Token} />
      <Route path="/lab" component={Lab} />
      <Route path="/wallet/:address" component={Wallet} />
      <Route path="/bad-actors" component={BadActors} />
      <Route path="/token/:ca/constellation" component={Constellation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <SolanaProvider>
          <WalletProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </WalletProvider>
        </SolanaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
