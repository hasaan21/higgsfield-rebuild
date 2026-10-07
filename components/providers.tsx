"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthBridge } from "@/components/auth/auth-bridge";
import { EngineTicker } from "@/components/engine-ticker";
import { PaywallDialog } from "@/components/paywall-dialog";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <AuthBridge />
      <EngineTicker />
      {children}
      <PaywallDialog />
      <Toaster theme="dark" position="bottom-right" />
    </TooltipProvider>
  );
}
