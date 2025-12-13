import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, Phone, MapPin, Clock, User, 
  Plus, Send, CheckCircle, XCircle, Loader2,
  Flame, Shield, Heart, HelpCircle, Siren
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SOSAlertDetails } from "@/components/sos/SOSAlertDetails";

interface SOSAlert {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  location: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
  };
}

const categories = [
  { value: "medical", label: "Urgence médicale", icon: Heart, color: "text-red-500" },
  { value: "security", label: "Sécurité", icon: Shield, color: "text-blue-500" },
  { value: "fire", label: "Incendie", icon: Flame, color: "text-orange-500" },
  { value: "other", label: "Autre", icon: HelpCircle, color: "text-gray-500" },
];

const priorities = [
  { value: "critical", label: "Critique", color: "bg-red-500" },
  { value: "high", label: "Haute", color: "bg-orange-500" },
  { value: "medium", label: "Moyenne", color: "bg-yellow-500" },
  { value: "low", label: "Basse", color: "bg-green-500" },
];

const statuses = [
  { value: "pending", label: "En attente", color: "bg-yellow-500/10 text-yellow-600" },
  { value: "in_progress", label: "En cours", color: "bg-blue-500/10 text-blue-600" },
  { value: "resolved", label: "Résolu", color: "bg-green-500/10 text-green-600" },
  { value: "cancelled", label: "Annulé", color: "bg-gray-500/10 text-gray-600" },
];

export default function SOS() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [newAlert, setNewAlert] = useState({
    title: "",
    description: "",
    category: "medical",
    priority: "high",
    location: ""
  });

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["sos-alerts", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("sos_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(data?.map(a => a.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      return data?.map(alert => ({
        ...alert,
        profile: profiles?.find(p => p.id === alert.user_id)
      })) as SOSAlert[];
    }
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("sos-alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_alerts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sos-alerts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createAlertMutation = useMutation({
    mutationFn: async (alert: typeof newAlert) => {
      const { error } = await supabase.from("sos_alerts").insert({
        user_id: user!.id,
        title: alert.title,
        description: alert.description || null,
        category: alert.category,
        priority: alert.priority,
        location: alert.location || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sos-alerts"] });
      setIsDialogOpen(false);
      setNewAlert({ title: "", description: "", category: "medical", priority: "high", location: "" });
      toast.success("Alerte SOS envoyée");
    },
    onError: () => toast.error("Erreur lors de l'envoi")
  });

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    if (!cat) return HelpCircle;
    return cat.icon;
  };

  const getCategoryColor = (category: string) => {
    return categories.find(c => c.value === category)?.color || "text-gray-500";
  };

  const getPriorityColor = (priority: string) => {
    return priorities.find(p => p.value === priority)?.color || "bg-gray-500";
  };

  const getStatusBadge = (status: string) => {
    const s = statuses.find(st => st.value === status);
    return s ? { label: s.label, color: s.color } : { label: status, color: "bg-gray-500/10 text-gray-600" };
  };

  const stats = {
    pending: alerts?.filter(a => a.status === "pending").length || 0,
    in_progress: alerts?.filter(a => a.status === "in_progress").length || 0,
    resolved: alerts?.filter(a => a.status === "resolved").length || 0,
    total: alerts?.length || 0
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Siren className="h-8 w-8 text-red-500" />
              SOS / Assistance
            </h1>
            <p className="text-muted-foreground">Signalement d'urgence et prise en charge</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-red-600 hover:bg-red-700">
                <AlertTriangle className="h-4 w-4" />
                Nouvelle alerte SOS
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Signaler une urgence
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Titre de l'alerte *</Label>
                  <Input
                    value={newAlert.title}
                    onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                    placeholder="Décrivez brièvement l'urgence"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select
                      value={newAlert.category}
                      onValueChange={(v) => setNewAlert({ ...newAlert, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <span className="flex items-center gap-2">
                              <cat.icon className={`h-4 w-4 ${cat.color}`} />
                              {cat.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select
                      value={newAlert.priority}
                      onValueChange={(v) => setNewAlert({ ...newAlert, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map(p => (
                          <SelectItem key={p.value} value={p.value}>
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${p.color}`} />
                              {p.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Localisation</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      value={newAlert.location}
                      onChange={(e) => setNewAlert({ ...newAlert, location: e.target.value })}
                      placeholder="Adresse ou lieu"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description détaillée</Label>
                  <Textarea
                    value={newAlert.description}
                    onChange={(e) => setNewAlert({ ...newAlert, description: e.target.value })}
                    placeholder="Décrivez la situation en détail..."
                    rows={4}
                  />
                </div>
                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={() => createAlertMutation.mutate(newAlert)}
                  disabled={!newAlert.title || createAlertMutation.isPending}
                >
                  {createAlertMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Envoyer l'alerte SOS
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">En cours</CardTitle>
              <Loader2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.in_progress}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Résolu</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolved}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <AlertTriangle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Alertes</CardTitle>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="all">Toutes</TabsTrigger>
                    <TabsTrigger value="pending">En attente</TabsTrigger>
                    <TabsTrigger value="in_progress">En cours</TabsTrigger>
                    <TabsTrigger value="resolved">Résolues</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Chargement...</div>
                ) : alerts?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune alerte</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts?.map((alert) => {
                      const CategoryIcon = getCategoryIcon(alert.category);
                      const statusBadge = getStatusBadge(alert.status);
                      return (
                        <div
                          key={alert.id}
                          onClick={() => setSelectedAlert(alert)}
                          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedAlert?.id === alert.id
                              ? "bg-primary/5 border-primary/20"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className={`rounded-full p-2 ${
                            alert.priority === "critical" ? "bg-red-500/10" :
                            alert.priority === "high" ? "bg-orange-500/10" :
                            "bg-muted"
                          }`}>
                            <CategoryIcon className={`h-5 w-5 ${getCategoryColor(alert.category)}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold truncate">{alert.title}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {alert.profile?.full_name || "Utilisateur"}
                                </p>
                              </div>
                              <Badge className={statusBadge.color}>
                                {statusBadge.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(alert.created_at), "d MMM HH:mm", { locale: fr })}
                              </span>
                              {alert.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {alert.location}
                                </span>
                              )}
                              <span className={`flex items-center gap-1`}>
                                <span className={`w-2 h-2 rounded-full ${getPriorityColor(alert.priority)}`} />
                                {priorities.find(p => p.value === alert.priority)?.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            {selectedAlert ? (
              <SOSAlertDetails 
                alert={selectedAlert} 
                onClose={() => setSelectedAlert(null)}
                categories={categories}
                priorities={priorities}
                statuses={statuses}
              />
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground py-12">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une alerte pour voir les détails</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
