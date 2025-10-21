import { useState } from "react";
import { Menu, X, Home as HomeIcon, LayoutDashboard } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

interface MobileNavProps {
  connected: boolean;
}

export function MobileNav({ connected }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [location, navigate] = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: HomeIcon },
    ...(connected
      ? [{ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard }]
      : []),
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden hover-elevate active-elevate-2"
          data-testid="button-mobile-nav"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" data-testid="sheet-mobile-nav">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Navigation</SheetTitle>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover-elevate active-elevate-2"
                data-testid="button-close-mobile-nav"
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>
        <div className="flex flex-col gap-2 mt-6">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={location === item.path ? "default" : "ghost"}
              className="justify-start hover-elevate active-elevate-2"
              onClick={() => {
                navigate(item.path);
                setOpen(false);
              }}
              data-testid={`link-mobile-${item.label.toLowerCase()}`}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.label}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
