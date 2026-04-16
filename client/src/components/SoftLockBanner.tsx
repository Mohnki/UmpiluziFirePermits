import { AlertTriangle } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuth } from "@/lib/AuthContext";

export default function SoftLockBanner() {
  const { user, isSuperAdmin, canManageBilling } = useAuth();
  const { data: sub } = useSubscriptionStatus();

  if (!user || isSuperAdmin || !sub || !sub.softLockEnabled || sub.isActive) {
    return null;
  }

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3" role="alert">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" aria-hidden="true" />
        <p className="text-sm text-destructive font-medium">
          Subscription inactive — new permits cannot be submitted.
          {canManageBilling ? (
            <a href="/billing" className="underline ml-1">Manage billing</a>
          ) : (
            <span className="ml-1">Contact your administrator to restore access.</span>
          )}
        </p>
      </div>
    </div>
  );
}
