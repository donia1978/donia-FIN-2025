import { 
  LayoutDashboard, 
  GraduationCap, 
  Stethoscope, 
  Bell, 
  Users, 
  Calendar, 
  MessageSquare, 
  BookOpen, 
  BarChart3, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Globe,
  Siren,
  FileText,
  Brain,
  PieChart,
  Newspaper
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { title: "Social", url: "/dashboard/social", icon: Globe },
  { title: "Information", url: "/dashboard/information", icon: Newspaper },
  { title: "SOS / Assistance", url: "/dashboard/sos", icon: Siren },
  { title: "Éducation", url: "/dashboard/education", icon: GraduationCap },
  { title: "Médical", url: "/dashboard/medical", icon: Stethoscope },
  { title: "Research Core", url: "/dashboard/research", icon: Brain },
  { title: "Statistics", url: "/dashboard/statistics", icon: PieChart },
  { title: "Agenda", url: "/dashboard/agenda", icon: Calendar },
  { title: "Cours en ligne", url: "/dashboard/courses", icon: BookOpen },
  { title: "Messagerie", url: "/dashboard/chat", icon: MessageSquare },
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
  { title: "Utilisateurs", url: "/dashboard/users", icon: Users },
  { title: "Analytiques", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "Documentation", url: "/documentation", icon: FileText },
  { title: "Paramètres", url: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const { signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-gradient-to-b from-sidebar to-sidebar/95 border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border/50">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-sm font-bold text-white">D</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">DONIA</span>
            </div>
          )}
          {collapsed && (
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
              <span className="text-sm font-bold text-white">D</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("text-sidebar-foreground hover:bg-sidebar-accent", collapsed && "hidden")}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.url}>
                <NavLink
                  to={item.url}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  activeClassName="bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:from-primary hover:to-accent hover:text-white"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border/50 p-4">
          {!collapsed && user && (
            <div className="mb-3 truncate text-sm text-sidebar-foreground/60">
              {user.email}
            </div>
          )}
          <Button
            variant="ghost"
            onClick={signOut}
            className={cn(
              "w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Déconnexion</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
