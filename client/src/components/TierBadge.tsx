import { Badge } from "@/components/ui/badge";
import { Shield, Zap, Sparkles } from "lucide-react";

export type TierType = "basic" | "pro" | "pro_plus";

interface TierBadgeProps {
  tier: TierType;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const config = {
    basic: {
      label: "Basic",
      icon: Shield,
      className: "bg-muted text-muted-foreground border-muted-border",
    },
    pro: {
      label: "Pro",
      icon: Zap,
      className: "bg-primary/10 text-primary border-primary/20",
    },
    pro_plus: {
      label: "Pro+",
      icon: Sparkles,
      className: "bg-gradient-to-r from-primary/10 to-accent/10 text-primary border-primary/20",
    },
  };

  const { label, icon: Icon, className: tierClass } = config[tier];

  return (
    <Badge
      variant="outline"
      className={`${tierClass} ${className}`}
      data-testid={`badge-tier-${tier}`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
