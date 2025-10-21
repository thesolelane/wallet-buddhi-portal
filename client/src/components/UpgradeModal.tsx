import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Copy, CheckCircle, ExternalLink } from "lucide-react";
import type { TierType } from "@/components/TierBadge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWallet } from "@/lib/wallet-context-new";

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
  const { address: walletAddress } = useWallet();
  const [paymentMethod, setPaymentMethod] = useState<"sol" | "cath">("sol");
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [referenceKey, setReferenceKey] = useState<string>("");
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const { toast } = useToast();

  const tierConfig = {
    pro: {
      name: "Pro",
      priceSOL: "0.1 SOL",
      priceCATH: "10 $CATH",
      features: [
        "Deep3 Labs AI analysis",
        "Advanced risk scoring",
        "Priority support",
        "Custom alerts",
      ],
    },
    pro_plus: {
      name: "Pro+",
      priceSOL: "0.25 SOL",
      priceCATH: "25 $CATH",
      features: [
        "Up to 5 arbitrage bots",
        "MEV protection",
        "Custom strategies",
        "Dedicated support",
      ],
    },
  };

  const config = tierConfig[tier];

  useEffect(() => {
    if (!open) {
      setPaymentUrl("");
      setReferenceKey("");
      setPaymentConfirmed(false);
      setIsVerifying(false);
    }
  }, [open]);

  useEffect(() => {
    if (!referenceKey || paymentConfirmed) return;

    const interval = setInterval(async () => {
      setIsVerifying(true);
      try {
        const res = await apiRequest("POST", "/api/payments/verify", { referenceKey });
        const response = await res.json();

        if (response.status === "confirmed") {
          setPaymentConfirmed(true);
          setIsVerifying(false);
          clearInterval(interval);
          
          onUpgrade(tier);
          
          toast({
            title: "Payment Confirmed!",
            description: `Successfully upgraded to ${config.name} tier.`,
          });

          setTimeout(() => {
            onOpenChange(false);
          }, 2000);
        }
      } catch (error) {
        console.error("Payment verification error:", error);
      }
      setIsVerifying(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [referenceKey, paymentConfirmed, tier, config.name, onUpgrade, toast, onOpenChange]);

  const handleCreatePayment = async () => {
    setIsCreatingPayment(true);
    try {
      const res = await apiRequest("POST", "/api/payments/create", {
        walletAddress,
        tier: tier === "pro_plus" ? "pro+" : tier,
        currency: paymentMethod,
      });
      
      const response = await res.json();

      setPaymentUrl(response.paymentUrl);
      setReferenceKey(response.referenceKey);
      
      toast({
        title: "Payment Request Created",
        description: "Please complete the payment using your Solana wallet.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create payment request. Please try again.",
        variant: "destructive",
      });
    }
    setIsCreatingPayment(false);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(paymentUrl);
    toast({
      title: "Copied!",
      description: "Payment URL copied to clipboard.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid={`modal-upgrade-${tier}`}>
        <DialogHeader>
          <DialogTitle>Upgrade to {config.name}</DialogTitle>
          <DialogDescription>
            {paymentUrl 
              ? "Complete payment using your Solana wallet"
              : `Choose your payment method to activate ${config.name} tier`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!paymentUrl ? (
            <>
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
                onClick={handleCreatePayment}
                disabled={isCreatingPayment}
                data-testid="button-confirm-upgrade"
              >
                {isCreatingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Payment...
                  </>
                ) : (
                  `Create Payment Request`
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              {paymentConfirmed ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <CheckCircle className="h-12 w-12 text-chart-3" />
                  <p className="text-lg font-semibold">Payment Confirmed!</p>
                  <p className="text-sm text-muted-foreground text-center">
                    Your account has been upgraded to {config.name} tier.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Payment URL:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={paymentUrl}
                        readOnly
                        className="flex-1 px-3 py-2 text-xs bg-muted rounded-md font-mono"
                        data-testid="input-payment-url"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleCopyUrl}
                        data-testid="button-copy-url"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button 
                      className="w-full hover-elevate active-elevate-2"
                      data-testid="button-open-wallet"
                    >
                      Open in Wallet
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>

                  <div className="flex items-center justify-center gap-2 pt-4">
                    {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
                    <p className="text-sm text-muted-foreground">
                      {isVerifying 
                        ? "Checking for payment confirmation..." 
                        : "Waiting for payment..."}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Open this URL in your Solana wallet (Phantom, Solflare, Backpack) to complete the payment.
                    Your tier will be upgraded automatically once payment is confirmed.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
