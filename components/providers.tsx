"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthBridge } from "@/components/auth/auth-bridge";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <AuthBridge />
      {children}
      <Toaster theme="dark" position="bottom-right" />
    </TooltipProvider>
  );
}
