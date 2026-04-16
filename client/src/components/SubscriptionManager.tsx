import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, AlertCircle, Check, Shield, Flame, FileCheck2, MapPinned, BarChart3 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useConfirm } from "@/components/ui/confirm-dialog";

declare global {
  interface Window {
    PaystackPop?: new () => {
      newTransaction: (config: any) => void;
    };
  }
}

const features = [
  { icon: FileCheck2, label: "Unlimited burn permit applications" },
  { icon: MapPinned, label: "GPS-tracked permit locations" },
  { icon: Shield, label: "Legal compliance with the Fire Act" },
  { icon: Flame, label: "Burn ban management" },
  { icon: BarChart3, label: "Historical reports and analytics" },
];

export default function SubscriptionManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useSubscriptionStatus();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");

  const getToken = async () => {
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  };

  const initMutation = useMutation({
    mutationFn: async (data: { plan: string; email: string }) => {
      const token = await getToken();
      const res = await fetch("/api/subscriptions/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: (resp) => {
      const data = resp.data;
      console.log("[SubscriptionManager] Paystack init data:", data);
      if (window.PaystackPop) {
        try {
          const popup = new window.PaystackPop();
          popup.newTransaction({
            key: data.publicKey,
            email: data.email,
            plan: data.planCode,
            currency: data.currency || "ZAR",
            metadata: data.metadata,
            onClose: () => toast({ title: "Cancelled", description: "Payment window closed." }),
            onSuccess: () => {
              toast({ title: "Subscription created!", description: "Your subscription is now active." });
              setTimeout(() => queryClient.invalidateQueries({ queryKey: ["subscription-status"] }), 2000);
            },
          });
        } catch (e) {
          console.error("[SubscriptionManager] Paystack popup error:", e);
          toast({ title: "Error", description: "Failed to open payment window. Check console.", variant: "destructive" });
        }
      } else {
        toast({ title: "Error", description: "Payment system not loaded. Refresh and try again.", variant: "destructive" });
      }
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const savedCardMutation = useMutation({
    mutationFn: async (data: { plan: string }) => {
      const token = await getToken();
      const res = await fetch("/api/subscriptions/create-with-saved-card", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Subscription activated!" });
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    },
    onError: (e: Error) => {
      if (e.message.includes("No") && e.message.includes("payment")) {
        initMutation.mutate({ plan: selectedPlan, email: user!.email! });
      } else {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Cancelled", description: "Access continues until end of billing period." });
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubscribe = (plan: "monthly" | "annual") => {
    setSelectedPlan(plan);
    if (status?.subscriptionStatus === "cancelled" && status?.paystackCustomerCode) {
      savedCardMutation.mutate({ plan });
    } else {
      initMutation.mutate({ plan, email: user!.email! });
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: "Cancel subscription?",
      description: "Your subscription will remain active until the end of the current billing period. After that, the system will become read-only until you resubscribe.",
      confirmLabel: "Yes, cancel subscription",
      destructive: true,
    });
    if (ok) cancelMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      </div>
    );
  }

  // Free access state
  if (status?.isFree) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <Check className="h-7 w-7 text-green-600 dark:text-green-400" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Free Access Active</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The UFPA Fire Permit System is currently free to use. No subscription is required.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <Check className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700 dark:text-green-300">All features included</AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-400">
                Your system administrator has enabled free access. All features are available without a subscription.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = status?.subscriptionStatus === "active";
  const isCancelled = status?.subscriptionStatus === "cancelled";
  const isPastDue = status?.subscriptionStatus === "past_due";
  const needsSubscription = !isActive;
  const isPending = initMutation.isPending || savedCardMutation.isPending;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
          <CreditCard className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {isActive ? "Your Subscription" : "Subscribe to UFPA Fire Permits"}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {isActive
            ? "Manage your subscription and billing details."
            : "Choose a plan to keep the fire permit system running for your association."}
        </p>
      </div>

      {/* Status alerts */}
      {isPastDue && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>
            Your last payment failed. Please update your payment method or subscribe again to restore full access.
          </AlertDescription>
        </Alert>
      )}

      {isCancelled && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-700 dark:text-orange-300">Subscription cancelled</AlertTitle>
          <AlertDescription className="text-orange-600 dark:text-orange-400">
            Your subscription has been cancelled.
            {status?.currentPeriodEnd && new Date(status.currentPeriodEnd) > new Date()
              ? ` Access continues until ${new Date(status.currentPeriodEnd).toLocaleDateString("en-ZA")}. Resubscribe anytime.`
              : " Resubscribe to restore access."}
          </AlertDescription>
        </Alert>
      )}

      {/* Active subscription details */}
      {isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Active Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Plan</p>
                <p className="text-lg font-bold capitalize">{status?.subscriptionPlan || "—"}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                <Badge className="bg-green-500 text-white">Active</Badge>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Next billing date</p>
                <p className="text-lg font-bold tabular-nums">
                  {status?.currentPeriodEnd
                    ? new Date(status.currentPeriodEnd).toLocaleDateString("en-ZA")
                    : "—"}
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="h-11 text-destructive hover:text-destructive"
              >
                {cancelMutation.isPending ? "Cancelling…" : "Cancel subscription"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing cards — show when not active */}
      {needsSubscription && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Monthly */}
          <Card className={`relative overflow-hidden transition-shadow hover:shadow-lg ${selectedPlan === "monthly" ? "ring-2 ring-primary" : ""}`}>
            <CardHeader>
              <CardTitle>Monthly</CardTitle>
              <CardDescription>Flexible, cancel anytime</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <span className="text-4xl font-bold">R250</span>
                <span className="text-muted-foreground ml-1">/ month</span>
              </div>
              <ul className="space-y-3">
                {features.map((f) => {
                  const Icon = f.icon;
                  return (
                    <li key={f.label} className="flex items-center gap-3 text-sm">
                      <Icon className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                      <span>{f.label}</span>
                    </li>
                  );
                })}
              </ul>
              <Button
                className="w-full h-12 text-base"
                onClick={() => handleSubscribe("monthly")}
                disabled={isPending}
              >
                <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />
                {isPending && selectedPlan === "monthly" ? "Processing…" : isCancelled ? "Resubscribe monthly" : "Subscribe monthly"}
              </Button>
            </CardContent>
          </Card>

          {/* Annual */}
          <Card className={`relative overflow-hidden transition-shadow hover:shadow-lg ${selectedPlan === "annual" ? "ring-2 ring-primary" : ""}`}>
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
              Best value
            </div>
            <CardHeader>
              <CardTitle>Annual</CardTitle>
              <CardDescription>Save with yearly billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <span className="text-4xl font-bold">R2,250</span>
                <span className="text-muted-foreground ml-1">/ year</span>
                <Badge variant="secondary" className="ml-2">Save R750</Badge>
              </div>
              <ul className="space-y-3">
                {features.map((f) => {
                  const Icon = f.icon;
                  return (
                    <li key={f.label} className="flex items-center gap-3 text-sm">
                      <Icon className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                      <span>{f.label}</span>
                    </li>
                  );
                })}
              </ul>
              <Button
                className="w-full h-12 text-base"
                onClick={() => handleSubscribe("annual")}
                disabled={isPending}
              >
                <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />
                {isPending && selectedPlan === "annual" ? "Processing…" : isCancelled ? "Resubscribe annually" : "Subscribe annually"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features reminder for active subscribers */}
      {isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What's included</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.label} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" aria-hidden="true" />
                    <span>{f.label}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Security note */}
      <p className="text-center text-xs text-muted-foreground">
        Payments are processed securely by Paystack. Your card details are never stored on our servers.
      </p>
    </div>
  );
}
