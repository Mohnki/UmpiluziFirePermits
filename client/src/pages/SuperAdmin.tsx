import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Redirect } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { FullPageSpinner } from "@/components/ui/loading-spinner";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Users, CreditCard, Settings, Loader2, Save } from "lucide-react";

interface UserRow {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  canManageBilling?: boolean;
}

interface SubState {
  subscriptionStatus: string;
  isFree: boolean;
  softLockEnabled: boolean;
  subscriptionPlan?: string;
  currentPeriodEnd?: string;
}

interface PsConfig {
  publicKey: string;
  monthlyPlanCode: string;
  annualPlanCode: string;
}

export default function SuperAdmin() {
  const { user, loading, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  // Users tab
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Subscription tab
  const [sub, setSub] = useState<SubState | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);

  // Config tab
  const [config, setConfig] = useState<PsConfig>({ publicKey: "", monthlyPlanCode: "", annualPlanCode: "" });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  const getToken = async () => user!.getIdToken();

  // Fetch data
  useEffect(() => {
    if (!user || !isSuperAdmin) return;
    const fetchAll = async () => {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [uRes, sRes, cRes] = await Promise.all([
          fetch("/api/superadmin/users", { headers }),
          fetch("/api/superadmin/subscription", { headers }),
          fetch("/api/superadmin/paystack-config", { headers }),
        ]);
        if (uRes.ok) { const j = await uRes.json(); setUsers(j.data || []); }
        if (sRes.ok) { const j = await sRes.json(); setSub(j.data); }
        if (cRes.ok) { const j = await cRes.json(); if (j.data) setConfig(j.data); }
      } catch (e) {
        console.error("Error fetching superadmin data:", e);
      } finally {
        setLoadingUsers(false);
        setLoadingSub(false);
        setLoadingConfig(false);
      }
    };
    fetchAll();
  }, [user, isSuperAdmin]);

  const updateRole = async (uid: string, role: string) => {
    const token = await getToken();
    const res = await fetch(`/api/superadmin/users/${uid}/role`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const j = await res.json();
    if (j.success) {
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
      toast({ title: "Role updated" });
    } else {
      toast({ title: "Error", description: j.error, variant: "destructive" });
    }
  };

  const toggleBilling = async (uid: string, val: boolean) => {
    const token = await getToken();
    const res = await fetch(`/api/superadmin/users/${uid}/billing`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ canManageBilling: val }),
    });
    const j = await res.json();
    if (j.success) {
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, canManageBilling: val } : u)));
      toast({ title: val ? "Billing access granted" : "Billing access revoked" });
    } else {
      toast({ title: "Error", description: j.error, variant: "destructive" });
    }
  };

  const toggleFree = async () => {
    const token = await getToken();
    const res = await fetch("/api/superadmin/subscription/toggle-free", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await res.json();
    if (j.success) {
      setSub((prev) => prev ? { ...prev, isFree: j.data.isFree } : prev);
      toast({ title: j.data.isFree ? "System set to free" : "Free access disabled" });
    }
  };

  const toggleSoftLock = async () => {
    const token = await getToken();
    const res = await fetch("/api/superadmin/subscription/toggle-softlock", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await res.json();
    if (j.success) {
      setSub((prev) => prev ? { ...prev, softLockEnabled: j.data.softLockEnabled } : prev);
      toast({ title: j.data.softLockEnabled ? "Soft-lock enabled" : "Soft-lock disabled" });
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/superadmin/paystack-config", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const j = await res.json();
      if (j.success) toast({ title: "Paystack config saved" });
      else toast({ title: "Error", description: j.error, variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) return <FullPageSpinner />;
  if (!isSuperAdmin) return <Redirect to="/" />;

  return (
    <>
      <Helmet><title>Super Admin - Umpiluzi FPA</title></Helmet>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow bg-gray-50 dark:bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-7 w-7 text-purple-600" aria-hidden="true" />
              <h1 className="text-2xl md:text-3xl font-bold">Super Admin</h1>
            </div>

            <Tabs defaultValue="users">
              <TabsList className="mb-6">
                <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4" />Users</TabsTrigger>
                <TabsTrigger value="subscription" className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Subscription</TabsTrigger>
                <TabsTrigger value="config" className="flex items-center gap-2"><Settings className="h-4 w-4" />Paystack Config</TabsTrigger>
              </TabsList>

              {/* Users tab */}
              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage roles and billing access for all users</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingUsers ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Billing access</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((u) => (
                              <TableRow key={u.uid}>
                                <TableCell className="font-medium">{u.displayName || "—"}</TableCell>
                                <TableCell className="text-sm">{u.email}</TableCell>
                                <TableCell>
                                  <Select value={u.role} onValueChange={(v) => updateRole(u.uid, v)} disabled={u.uid === user?.uid}>
                                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="superadmin">Super Admin</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="area-manager">Area Manager</SelectItem>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="api-user">API User</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Switch
                                    checked={u.canManageBilling ?? false}
                                    onCheckedChange={(v) => toggleBilling(u.uid, v)}
                                    disabled={u.role === "superadmin"}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Subscription tab */}
              <TabsContent value="subscription">
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Control</CardTitle>
                    <CardDescription>Manage system-wide subscription status and enforcement</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {loadingSub ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : sub ? (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-xl border p-4">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                            <Badge variant={sub.subscriptionStatus === "active" ? "default" : sub.subscriptionStatus === "free" ? "secondary" : "destructive"} className={sub.subscriptionStatus === "active" ? "bg-green-500" : ""}>
                              {sub.subscriptionStatus}
                            </Badge>
                          </div>
                          <div className="rounded-xl border p-4">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Plan</p>
                            <p className="font-semibold capitalize">{sub.subscriptionPlan || "—"}</p>
                          </div>
                          <div className="rounded-xl border p-4">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Renews</p>
                            <p className="font-semibold tabular-nums">{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-ZA") : "—"}</p>
                          </div>
                          <div className="rounded-xl border p-4">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Soft-lock</p>
                            <Badge variant={sub.softLockEnabled ? "destructive" : "secondary"}>{sub.softLockEnabled ? "Enabled" : "Disabled"}</Badge>
                          </div>
                        </div>

                        <div className="space-y-4 rounded-xl border p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Free access</p>
                              <p className="text-sm text-muted-foreground">When on, the system works without a subscription.</p>
                            </div>
                            <Switch checked={sub.isFree} onCheckedChange={toggleFree} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Soft-lock enforcement</p>
                              <p className="text-sm text-muted-foreground">When on and subscription inactive, blocks new permits. Read-only for users.</p>
                            </div>
                            <Switch checked={sub.softLockEnabled} onCheckedChange={toggleSoftLock} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No subscription data found. Run the migration script.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Paystack config tab */}
              <TabsContent value="config">
                <Card>
                  <CardHeader>
                    <CardTitle>Paystack Configuration</CardTitle>
                    <CardDescription>Set your Paystack keys and plan codes. Create plans in the Paystack dashboard first.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loadingConfig ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : (
                      <>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Public key</label>
                          <Input
                            value={config.publicKey}
                            onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
                            placeholder="pk_live_xxx or pk_test_xxx"
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Monthly plan code</label>
                            <Input
                              value={config.monthlyPlanCode}
                              onChange={(e) => setConfig({ ...config, monthlyPlanCode: e.target.value })}
                              placeholder="PLN_xxx"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Annual plan code</label>
                            <Input
                              value={config.annualPlanCode}
                              onChange={(e) => setConfig({ ...config, annualPlanCode: e.target.value })}
                              placeholder="PLN_xxx"
                            />
                          </div>
                        </div>
                        <Button onClick={saveConfig} disabled={savingConfig} className="h-11">
                          {savingConfig ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                          {savingConfig ? "Saving…" : "Save configuration"}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
