import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  BookOpen, 
  MessageSquare, 
  Calendar, 
  TrendingUp, 
  GraduationCap,
  Activity,
  BarChart3
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface Stats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalMessages: number;
  totalEvents: number;
  completedLessons: number;
}

interface RoleDistribution {
  name: string;
  value: number;
  color: string;
}

interface ActivityData {
  date: string;
  users: number;
  messages: number;
  enrollments: number;
}

interface CourseStats {
  name: string;
  enrollments: number;
  completions: number;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "#ef4444",
  teacher: "#3b82f6",
  student: "#22c55e",
  medical_staff: "#a855f7",
  parent: "#f97316",
  user: "#6b7280",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateurs",
  teacher: "Enseignants",
  student: "Étudiants",
  medical_staff: "Personnel médical",
  parent: "Parents",
  user: "Utilisateurs",
};

export default function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalMessages: 0,
    totalEvents: 0,
    completedLessons: 0,
  });
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);

    // Fetch counts
    const [
      { count: usersCount },
      { count: coursesCount },
      { count: enrollmentsCount },
      { count: messagesCount },
      { count: eventsCount },
      { count: completedCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('enrollments').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('lesson_progress').select('*', { count: 'exact', head: true }).eq('completed', true),
    ]);

    setStats({
      totalUsers: usersCount || 0,
      totalCourses: coursesCount || 0,
      totalEnrollments: enrollmentsCount || 0,
      totalMessages: messagesCount || 0,
      totalEvents: eventsCount || 0,
      completedLessons: completedCount || 0,
    });

    // Fetch role distribution
    const { data: rolesData } = await supabase.from('user_roles').select('role');
    
    if (rolesData) {
      const roleCounts: Record<string, number> = {};
      rolesData.forEach(r => {
        roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
      });
      
      const distribution = Object.entries(roleCounts).map(([role, count]) => ({
        name: ROLE_LABELS[role] || role,
        value: count,
        color: ROLE_COLORS[role] || "#6b7280",
      }));
      setRoleDistribution(distribution);
    }

    // Generate activity data (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', last7Days[0]);

    const { data: recentMessages } = await supabase
      .from('messages')
      .select('created_at')
      .gte('created_at', last7Days[0]);

    const { data: recentEnrollments } = await supabase
      .from('enrollments')
      .select('enrolled_at')
      .gte('enrolled_at', last7Days[0]);

    const activity = last7Days.map(date => {
      const dayUsers = recentProfiles?.filter(p => p.created_at.startsWith(date)).length || 0;
      const dayMessages = recentMessages?.filter(m => m.created_at.startsWith(date)).length || 0;
      const dayEnrollments = recentEnrollments?.filter(e => e.enrolled_at.startsWith(date)).length || 0;
      
      return {
        date: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        users: dayUsers,
        messages: dayMessages,
        enrollments: dayEnrollments,
      };
    });
    setActivityData(activity);

    // Fetch course stats
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title')
      .eq('is_published', true)
      .limit(5);

    if (courses) {
      const courseStatsData = await Promise.all(
        courses.map(async (course) => {
          const { count: enrollmentCount } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          const { count: completionCount } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id)
            .not('completed_at', 'is', null);

          return {
            name: course.title.length > 20 ? course.title.slice(0, 20) + '...' : course.title,
            enrollments: enrollmentCount || 0,
            completions: completionCount || 0,
          };
        })
      );
      setCourseStats(courseStatsData);
    }

    setLoading(false);
  };

  const statCards = [
    { title: "Utilisateurs", value: stats.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Cours", value: stats.totalCourses, icon: BookOpen, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Inscriptions", value: stats.totalEnrollments, icon: GraduationCap, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Messages", value: stats.totalMessages, icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Événements", value: stats.totalEvents, icon: Calendar, color: "text-pink-500", bg: "bg-pink-500/10" },
    { title: "Leçons terminées", value: stats.completedLessons, icon: TrendingUp, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Analytiques
        </h1>
        <p className="text-muted-foreground">
          Vue d'ensemble des statistiques de la plateforme
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activité</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="courses">Cours</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activité des 7 derniers jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="users"
                      name="Nouveaux utilisateurs"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorUsers)"
                    />
                    <Area
                      type="monotone"
                      dataKey="messages"
                      name="Messages"
                      stroke="#22c55e"
                      fillOpacity={1}
                      fill="url(#colorMessages)"
                    />
                    <Area
                      type="monotone"
                      dataKey="enrollments"
                      name="Inscriptions"
                      stroke="#a855f7"
                      fillOpacity={1}
                      fill="url(#colorEnrollments)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Distribution des rôles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {roleDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistiques utilisateurs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {roleDistribution.map((role) => (
                  <div key={role.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: role.color }}
                      />
                      <span>{role.name}</span>
                    </div>
                    <span className="font-semibold">{role.value}</span>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span>{stats.totalUsers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Performance des cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="enrollments" name="Inscriptions" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="completions" name="Terminés" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-4xl font-bold text-primary">{stats.totalCourses}</p>
                <p className="text-muted-foreground">Cours disponibles</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-4xl font-bold text-green-500">{stats.totalEnrollments}</p>
                <p className="text-muted-foreground">Inscriptions totales</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-4xl font-bold text-purple-500">{stats.completedLessons}</p>
                <p className="text-muted-foreground">Leçons complétées</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
