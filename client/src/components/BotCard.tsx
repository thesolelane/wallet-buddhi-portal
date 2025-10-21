import { Bot, TrendingUp, Settings, Power } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export interface BotCardProps {
  id: string;
  name: string;
  strategy: string;
  status: "active" | "inactive" | "paused";
  performance?: string;
  onToggle?: (active: boolean) => void;
  onConfigure?: () => void;
}

export function BotCard({
  id,
  name,
  strategy,
  status,
  performance,
  onToggle,
  onConfigure,
}: BotCardProps) {
  const [isActive, setIsActive] = useState(status === "active");

  const handleToggle = (checked: boolean) => {
    setIsActive(checked);
    onToggle?.(checked);
  };

  return (
    <Card className="hover-elevate transition-all" data-testid={`card-bot-${id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base font-semibold">{name}</CardTitle>
            <p className="text-sm text-muted-foreground">{strategy}</p>
          </div>
        </div>
        
        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          data-testid={`switch-bot-${id}`}
        />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant={isActive ? "default" : "secondary"}
              className="capitalize"
              data-testid={`badge-bot-status-${id}`}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
            {performance && (
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {performance}
              </Badge>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full hover-elevate active-elevate-2"
          onClick={onConfigure}
          data-testid={`button-configure-bot-${id}`}
        >
          <Settings className="h-4 w-4 mr-2" />
          Configure
        </Button>
      </CardContent>
    </Card>
  );
}
