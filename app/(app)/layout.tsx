import { AuthGate } from "@/components/auth/auth-gate";
import { QueuePanel } from "@/components/queue/queue-panel";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate>
      <div className="flex flex-1">
        <div className="min-w-0 flex-1">{children}</div>
        <QueuePanel />
      </div>
    </AuthGate>
  );
}
