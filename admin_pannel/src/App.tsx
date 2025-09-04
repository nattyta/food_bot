import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RoleBasedLogin } from "./components/Auth/RoleBasedLogin";
import { Header } from "./components/Layout/Header";
import { Sidebar } from "./components/Layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Menu from "./pages/Menu";
import StaffDashboard from "./pages/StaffDashboard";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import StaffManagement from "./pages/StaffManagement";
import NotFoundPage from "./pages/NotFoundPage";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <RoleBasedLogin />;
  }

  // Route based on user role
  const getDefaultRoute = () => {
    if (!user) return <Dashboard />;
    
    switch (user.role) {
      case 'admin':
        return <Dashboard />;
      case 'staff':
        return <StaffDashboard />;
      case 'delivery':
        return <DeliveryDashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={getDefaultRoute()} />
        {user?.role === 'admin' && (
          <>
            <Route path="/orders" element={<Orders />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/analytics" element={<div className="p-6">Analytics - Coming Soon</div>} />
            <Route path="/staff-management" element={<StaffManagement />} />
          </>
        )}
        {user?.role === 'staff' && (
          <Route path="/staff" element={<StaffDashboard />} />
        )}
        {user?.role === 'delivery' && (
          <Route path="/delivery" element={<DeliveryDashboard />} />
        )}
        <Route path="/settings" element={<div className="p-6">Settings - Coming Soon</div>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
