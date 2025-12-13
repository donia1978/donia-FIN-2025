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
  Brain
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { title: "Social", url: "/dashboard/social", icon: Globe },
  { title: "SOS / Assistance", url: "/dashboard/sos", icon: Siren },
  { title: "Éducation", url: "/dashboard/education", icon: GraduationCap },
  { title: "Médical", url: "/dashboard/medical", icon: Stethoscope },
  { title: "Research Core", url: "/dashboard/research", icon: Brain },
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
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <span className="text-xl font-bold text-primary">DONIA</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.url}>
                <NavLink
                  to={item.url}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  activeClassName="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          {!collapsed && user && (
            <div className="mb-3 truncate text-sm text-muted-foreground">
              {user.email}
            </div>
          )}
          <Button
            variant="ghost"
            onClick={signOut}
            className={cn(
              "w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10",
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
