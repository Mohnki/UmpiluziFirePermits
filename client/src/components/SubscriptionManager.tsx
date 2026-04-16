import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

export default function SubscriptionManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useSubscriptionStatus();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
              toast({ title: "Subscription created", description: "Refreshing status…" });
              setTimeout(() => queryClient.invalidateQueries({ queryKey: ["subscription-status"] }), 2000);
              setIsDialogOpen(false);
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
      toast({ title: "Subscription activated" });
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
      setIsDialogOpen(false);
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

  const handleSubscribe = () => {
    if (status?.subscriptionStatus === "cancelled" && status?.paystackCustomerCode) {
      savedCardMutation.mutate({ plan: selectedPlan });
    } else {
      initMutation.mutate({ plan: selectedPlan, email: user!.email! });
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: "Cancel subscription?",
      description: "Access continues until the end of the current billing period. You can resubscribe at any time.",
      confirmLabel: "Yes, cancel",
      destructive: true,
    });
    if (ok) cancelMutation.mutate();
  };

  if (isLoading) {
    return <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>;
  }

  if (status?.isFree) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" />Subscription</CardTitle></CardHeader>
        <CardContent>
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <Check className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700 dark:text-green-300">Free access</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">This system is currently free. No subscription required.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const showSubscribe = !status?.subscriptionStatus || status.subscriptionStatus === "cancelled" || status.subscriptionStatus === "past_due" || status.subscriptionStatus === "none" || status.subscriptionStatus === "free";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Subscription</CardTitle>
          <CardDescription>Manage the UFPA system subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge variant={status?.subscriptionStatus === "active" ? "default" : "destructive"} className={status?.subscriptionStatus === "active" ? "bg-green-500" : ""}>
              {status?.subscriptionStatus === "active" ? "Active" : status?.subscriptionStatus === "past_due" ? "Payment failed" : status?.subscriptionStatus === "cancelled" ? "Cancelled" : "No subscription"}
            </Badge>
          </div>

          {status?.subscriptionStatus === "active" && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium capitalize">{status.subscriptionPlan}</span></div>
              {status.currentPeriodEnd && (
                <div className="flex justify-between"><span className="text-muted-foreground">Renews</span><span className="font-medium tabular-nums">{new Date(status.currentPeriodEnd).toLocaleDateString("en-ZA")}</span></div>
              )}
            </div>
          )}

          {(status?.subscriptionStatus === "past_due" || status?.subscriptionStatus === "cancelled") && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Subscription issue</AlertTitle>
              <AlertDescription>
                {status.subscriptionStatus === "past_due" ? "Payment failed. Update your payment method." : "Subscription cancelled. Resubscribe to maintain access."}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            {showSubscribe && <Button onClick={() => setIsDialogOpen(true)} className="w-full h-11"><CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />{status?.subscriptionStatus === "cancelled" ? "Resubscribe" : "Subscribe now"}</Button>}
            {status?.subscriptionStatus === "active" && <Button variant="outline" onClick={handleCancel} className="w-full h-11">Cancel subscription</Button>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose your plan</DialogTitle>
            <DialogDescription>Select a subscription plan for the UFPA Fire Permit System</DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as "monthly" | "annual")}>
            <Label htmlFor="monthly" className="flex items-center justify-between p-4 border rounded-md cursor-pointer hover:bg-muted/50">
              <div className="flex items-center gap-3"><RadioGroupItem value="monthly" id="monthly" /><div><div className="font-semibold">Monthly</div><div className="text-sm text-muted-foreground">Billed monthly</div></div></div>
            </Label>
            <Label htmlFor="annual" className="flex items-center justify-between p-4 border rounded-md cursor-pointer hover:bg-muted/50">
              <div className="flex items-center gap-3"><RadioGroupItem value="annual" id="annual" /><div><div className="font-semibold">Annual</div><div className="text-sm text-muted-foreground">Billed yearly</div><Badge variant="secondary" className="mt-1">Best value</Badge></div></div>
            </Label>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubscribe} disabled={initMutation.isPending || savedCardMutation.isPending}>
              {initMutation.isPending || savedCardMutation.isPending ? "Processing…" : "Continue to payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
