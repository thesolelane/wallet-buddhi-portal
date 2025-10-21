import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import type { TierType } from "@/components/TierBadge";
import { useToast } from "@/hooks/use-toast";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: "pro" | "pro_plus";
  onUpgrade: (tier: TierType) => void;
}

export function UpgradeModal({
  open,
  onOpenChange,
  tier,
  onUpgrade,
}: UpgradeModalProps) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"sol" | "cath">("sol");
  const { toast } = useToast();

  const tierConfig = {
    pro: {
      name: "Pro",
      priceSOL: "0.05 SOL",
      priceCATH: "50 $CATH",
      features: [
        "Deep3 Labs AI analysis",
        "Advanced risk scoring",
        "Priority support",
        "Custom alerts",
      ],
    },
    pro_plus: {
      name: "Pro+",
      priceSOL: "0.15 SOL",
      priceCATH: "100 $CATH",
      features: [
        "Up to 5 arbitrage bots",
        "MEV protection",
        "Custom strategies",
        "Dedicated support",
      ],
    },
  };

  const config = tierConfig[tier];

  const handleUpgrade = async () => {
    setProcessing(true);
    
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    onUpgrade(tier);
    setProcessing(false);
    onOpenChange(false);
    
    toast({
      title: "Upgrade Successful!",
      description: `You've been upgraded to ${config.name}. Welcome aboard!`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid={`modal-upgrade-${tier}`}>
        <DialogHeader>
          <DialogTitle>Upgrade to {config.name}</DialogTitle>
          <DialogDescription>
            Choose your payment method to activate {config.name} tier
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Button
              variant={paymentMethod === "sol" ? "default" : "outline"}
              className="w-full h-auto py-4 justify-between hover-elevate active-elevate-2"
              onClick={() => setPaymentMethod("sol")}
              data-testid="button-payment-sol"
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold">Pay with SOL</span>
                <span className="text-sm opacity-80">{config.priceSOL} / month</span>
              </div>
              {paymentMethod === "sol" && <Check className="h-5 w-5" />}
            </Button>

            <Button
              variant={paymentMethod === "cath" ? "default" : "outline"}
              className="w-full h-auto py-4 justify-between hover-elevate active-elevate-2"
              onClick={() => setPaymentMethod("cath")}
              data-testid="button-payment-cath"
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold">Pay with $CATH</span>
                <span className="text-sm opacity-80">{config.priceCATH} / month</span>
              </div>
              {paymentMethod === "cath" && <Check className="h-5 w-5" />}
            </Button>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">What you'll get:</p>
            {config.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-chart-3 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>

          <Button
            className="w-full hover-elevate active-elevate-2"
            onClick={handleUpgrade}
            disabled={processing}
            data-testid="button-confirm-upgrade"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              `Upgrade to ${config.name}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
