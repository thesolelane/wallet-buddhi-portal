import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export interface TierCardProps {
  name: string;
  price: string;
  priceInCath?: string;
  description: string;
  features: string[];
  popular?: boolean;
  locked?: boolean;
  onUpgrade?: () => void;
  current?: boolean;
}

export function TierCard({
  name,
  price,
  priceInCath,
  description,
  features,
  popular,
  locked,
  onUpgrade,
  current,
}: TierCardProps) {
  return (
    <Card
      className={`relative hover-elevate transition-all ${
        popular ? "border-primary shadow-lg" : ""
      }`}
      data-testid={`card-tier-${name.toLowerCase().replace('+', '-plus')}`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
            Most Popular
          </span>
        </div>
      )}
      
      <CardHeader className="space-y-4 pb-4">
        <div>
          <h3 className="text-2xl font-bold">{name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{price}</span>
            {price !== "Free" && <span className="text-muted-foreground">/month</span>}
          </div>
          {priceInCath && (
            <p className="text-sm text-muted-foreground">or {priceInCath}</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-6">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <Check className="h-5 w-5 text-chart-3 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{feature}</span>
          </div>
        ))}
      </CardContent>

      <CardFooter>
        {current ? (
          <Button
            className="w-full"
            variant="secondary"
            disabled
            data-testid="button-current-plan"
          >
            Current Plan
          </Button>
        ) : (
          <Button
            className="w-full hover-elevate active-elevate-2"
            variant={popular ? "default" : "outline"}
            onClick={onUpgrade}
            disabled={locked}
            data-testid={`button-upgrade-${name.toLowerCase().replace('+', '-plus')}`}
          >
            {locked ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Locked
              </>
            ) : (
              `Upgrade to ${name}`
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
