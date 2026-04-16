import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import AreaManager from "@/pages/AreaManager";
import ApplyPermit from "@/pages/ApplyPermit";
import ManageFarms from "@/pages/ManageFarms";
import MyPermits from "@/pages/MyPermits";
import TodaysPermits from "@/pages/TodaysPermits";
import ApiDocumentation from "@/pages/ApiDocumentation";
import PermitReports from "@/pages/PermitReports";
import UserReports from "@/pages/UserReports";
import Safety from "@/pages/Safety";
import RiskCalculator from "@/pages/RiskCalculator";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import SuperAdmin from "@/pages/SuperAdmin";
import SoftLockBanner from "@/components/SoftLockBanner";
import SubscriptionManager from "@/components/SubscriptionManager";
import Header from "@/components/Header";

function BillingPage() {
  const { canManageBilling, isSuperAdmin, loading } = useAuth();
  if (loading) return null;
  if (!canManageBilling && !isSuperAdmin) return <NotFound />;
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-8"><SubscriptionManager /></div>
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route path="/area-manager" component={AreaManager} />
      <Route path="/apply-permit" component={ApplyPermit} />
      <Route path="/my-farms" component={ManageFarms} />
      <Route path="/my-permits" component={MyPermits} />
      <Route path="/todays-permits" component={TodaysPermits} />
      <Route path="/api-docs" component={ApiDocumentation} />
      <Route path="/reports" component={PermitReports} />
      <Route path="/user-reports" component={UserReports} />
      <Route path="/safety" component={Safety} />
      <Route path="/risk-calculator" component={RiskCalculator} />
      <Route path="/superadmin" component={SuperAdmin} />
      <Route path="/billing" component={BillingPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="umpiluzi-theme">
          <TooltipProvider>
            <ConfirmDialogProvider>
              <SoftLockBanner />
              <Toaster />
              <Router />
              <PWAInstallPrompt />
            </ConfirmDialogProvider>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
