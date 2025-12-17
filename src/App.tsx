import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Education from "./pages/dashboard/Education";
import Medical from "./pages/dashboard/Medical";
import Notifications from "./pages/dashboard/Notifications";
import Agenda from "./pages/dashboard/Agenda";
import Courses from "./pages/dashboard/Courses";
import Chat from "./pages/dashboard/Chat";
import UserManagement from "./pages/dashboard/UserManagement";
import Analytics from "./pages/dashboard/Analytics";
import Social from "./pages/dashboard/Social";
import SOS from "./pages/dashboard/SOS";
import Research from "./pages/dashboard/Research";
import Statistics from "./pages/dashboard/Statistics";
import Information from "./pages/dashboard/Information";
import Documentation from "./pages/Documentation";
import Profile from "./pages/dashboard/Profile";
import Settings from "./pages/dashboard/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/education" element={<Education />} />
            <Route path="/dashboard/medical" element={<Medical />} />
            <Route path="/dashboard/notifications" element={<Notifications />} />
            <Route path="/dashboard/agenda" element={<Agenda />} />
            <Route path="/dashboard/courses" element={<Courses />} />
            <Route path="/dashboard/chat" element={<Chat />} />
            <Route path="/dashboard/users" element={<UserManagement />} />
            <Route path="/dashboard/analytics" element={<Analytics />} />
            <Route path="/dashboard/social" element={<Social />} />
            <Route path="/dashboard/sos" element={<SOS />} />
            <Route path="/dashboard/research" element={<Research />} />
            <Route path="/dashboard/statistics" element={<Statistics />} />
            <Route path="/dashboard/information" element={<Information />} />
            <Route path="/dashboard/profile" element={<Profile />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/documentation" element={<Documentation />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
