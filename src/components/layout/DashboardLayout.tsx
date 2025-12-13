import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "./DashboardSidebar";
import { GlobalSearch, useGlobalSearch } from "@/components/GlobalSearch";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { open, setOpen } = useGlobalSearch();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      
      {/* Top Search Bar */}
      <div className="fixed top-0 left-64 right-0 z-30 h-16 bg-background/80 backdrop-blur-sm border-b border-border px-6 flex items-center justify-between">
        <Button
          variant="outline"
          className="w-full max-w-md justify-start text-muted-foreground gap-2"
          onClick={() => setOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span>Rechercher...</span>
          <kbd className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        <div className="flex items-center gap-2 ml-4">
          <NotificationCenter />
        </div>
      </div>

      <GlobalSearch open={open} onOpenChange={setOpen} />

      <main className="pl-64 pt-16 transition-all duration-300">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
