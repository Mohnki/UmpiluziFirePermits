import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";

export interface SubscriptionStatus {
  subscriptionStatus: string;
  isFree: boolean;
  softLockEnabled: boolean;
  isActive: boolean;
  subscriptionPlan?: string;
  currentPeriodEnd?: string;
  subscriptionCode?: string;
  paystackCustomerCode?: string;
}

export function useSubscriptionStatus() {
  const { user, canManageBilling, isSuperAdmin } = useAuth();

  return useQuery<SubscriptionStatus>({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const token = await user!.getIdToken();
      const res = await fetch("/api/subscriptions/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch subscription status");
      const json = await res.json();
      return json.data;
    },
    enabled: !!(user && (canManageBilling || isSuperAdmin)),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
