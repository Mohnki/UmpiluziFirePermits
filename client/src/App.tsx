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
import { AuthProvider } from "./lib/AuthContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

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
            <Toaster />
            <Router />
            <PWAInstallPrompt />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
