import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  GraduationCap, 
  Stethoscope, 
  Users, 
  Bell, 
  Calendar, 
  BookOpen,
  TrendingUp,
  Clock,
  Cloud
} from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { title: "Étudiants", value: "1,234", icon: GraduationCap, gradient: "from-primary to-accent" },
  { title: "Consultations", value: "89", icon: Stethoscope, gradient: "from-success to-primary" },
  { title: "Utilisateurs", value: "5,678", icon: Users, gradient: "from-info to-primary" },
  { title: "Notifications", value: "12", icon: Bell, gradient: "from-warning to-destructive" },
];

const quickActions = [
  { title: "Éducation", description: "Gérer les cours et examens", icon: GraduationCap, href: "/dashboard/education", color: "bg-primary" },
  { title: "Médical", description: "Rendez-vous et dossiers", icon: Stethoscope, href: "/dashboard/medical", color: "bg-success" },
  { title: "Donia Cloud", description: "Stockage de fichiers sécurisé", icon: Cloud, href: "/dashboard/cloud", color: "bg-purple-500" },
  { title: "Agenda", description: "Planifier les événements", icon: Calendar, href: "/dashboard/agenda", color: "bg-info" },
  { title: "Cours en ligne", description: "Accéder aux formations", icon: BookOpen, href: "/dashboard/courses", color: "bg-accent" },
];

const recentActivities = [
  { title: "Nouveau cours ajouté", time: "Il y a 2 heures", icon: BookOpen, color: "bg-primary/10 text-primary" },
  { title: "Consultation programmée", time: "Il y a 4 heures", icon: Stethoscope, color: "bg-success/10 text-success" },
  { title: "Résultats publiés", time: "Il y a 6 heures", icon: TrendingUp, color: "bg-info/10 text-info" },
  { title: "Réunion planifiée", time: "Il y a 8 heures", icon: Calendar, color: "bg-accent/10 text-accent" },
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header with gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent p-8 text-primary-foreground">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="relative">
            <h1 className="text-3xl font-bold">Bienvenue sur DONIA</h1>
            <p className="mt-2 text-primary-foreground/80">Votre plateforme médicale et éducative intelligente</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="group relative overflow-hidden border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-xl bg-gradient-to-br ${stat.gradient} p-2.5`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Accès rapide</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {quickActions.map((action) => (
              <Link key={action.href} to={action.href}>
                <Card className="group cursor-pointer border-0 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className={`rounded-xl ${action.color} p-3 transition-transform group-hover:scale-110`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{action.title}</CardTitle>
                        <CardDescription>{action.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Activité récente
              </CardTitle>
              <CardDescription>Les dernières actions sur la plateforme</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 rounded-lg p-2 transition-colors hover:bg-muted/50">
                    <div className={`rounded-xl p-2.5 ${activity.color}`}>
                      <activity.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-border/50">
              <CardTitle>Statistiques du jour</CardTitle>
              <CardDescription>Aperçu des performances</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Cours complétés</span>
                    <span className="font-semibold text-primary">45%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-3 w-[45%] rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Présence</span>
                    <span className="font-semibold text-success">78%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-3 w-[78%] rounded-full bg-gradient-to-r from-success to-primary transition-all duration-500" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Satisfaction</span>
                    <span className="font-semibold text-info">92%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-3 w-[92%] rounded-full bg-gradient-to-r from-info to-accent transition-all duration-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}