import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  X, Clock, MapPin, User, Send, CheckCircle, 
  AlertTriangle, MessageSquare, Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

interface Category {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface Priority {
  value: string;
  label: string;
  color: string;
}

interface Status {
  value: string;
  label: string;
  color: string;
}

interface SOSAlertDetailsProps {
  alert: SOSAlert;
  onClose: () => void;
  categories: Category[];
  priorities: Priority[];
  statuses: Status[];
}

export function SOSAlertDetails({ alert, onClose, categories, priorities, statuses }: SOSAlertDetailsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [newStatus, setNewStatus] = useState(alert.status);

  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ["sos-comments", alert.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sos_comments")
        .select("*")
        .eq("alert_id", alert.id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(data?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      return data?.map(comment => ({
        ...comment,
        profile: profiles?.find(p => p.id === comment.user_id)
      }));
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("sos_comments").insert({
        alert_id: alert.id,
        user_id: user!.id,
        content
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sos-comments", alert.id] });
      setNewComment("");
      toast.success("Commentaire ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout")
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const updateData: any = { status };
      if (status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }
      if (status === "in_progress" && !alert.assigned_to) {
        updateData.assigned_to = user!.id;
      }
      const { error } = await supabase
        .from("sos_alerts")
        .update(updateData)
        .eq("id", alert.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sos-alerts"] });
      toast.success("Statut mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour")
  });

  const takeChargeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("sos_alerts")
        .update({ 
          assigned_to: user!.id,
          status: "in_progress"
        })
        .eq("id", alert.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sos-alerts"] });
      toast.success("Alerte prise en charge");
    },
    onError: () => toast.error("Erreur")
  });

  const CategoryIcon = categories.find(c => c.value === alert.category)?.icon || AlertTriangle;
  const categoryColor = categories.find(c => c.value === alert.category)?.color || "text-gray-500";
  const priorityInfo = priorities.find(p => p.value === alert.priority);
  const statusInfo = statuses.find(s => s.value === alert.status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${
              alert.priority === "critical" ? "bg-red-500/10" : "bg-muted"
            }`}>
              <CategoryIcon className={`h-6 w-6 ${categoryColor}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{alert.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={statusInfo?.color || ""}>
                  {statusInfo?.label || alert.status}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className={`w-2 h-2 rounded-full ${priorityInfo?.color}`} />
                  {priorityInfo?.label}
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{alert.profile?.full_name || "Utilisateur"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(alert.created_at), "d MMM HH:mm", { locale: fr })}</span>
          </div>
          {alert.location && (
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <MapPin className="h-4 w-4" />
              <span>{alert.location}</span>
            </div>
          )}
        </div>

        {alert.description && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm">{alert.description}</p>
          </div>
        )}

        <Separator />

        {/* Actions */}
        {alert.status !== "resolved" && alert.status !== "cancelled" && (
          <div className="space-y-3">
            {!alert.assigned_to && (
              <Button 
                className="w-full"
                onClick={() => takeChargeMutation.mutate()}
                disabled={takeChargeMutation.isPending}
              >
                {takeChargeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Prendre en charge
              </Button>
            )}
            
            <div className="flex gap-2">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => updateStatusMutation.mutate(newStatus)}
                disabled={newStatus === alert.status || updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Mettre à jour"
                )}
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Comments */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Suivi ({comments?.length || 0})
          </h4>
          
          <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
            {loadingComments ? (
              <p className="text-sm text-muted-foreground text-center py-2">Chargement...</p>
            ) : comments?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">Aucun commentaire</p>
            ) : (
              comments?.map((comment: any) => (
                <div key={comment.id} className="p-2 rounded bg-muted/30 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{comment.profile?.full_name || "Utilisateur"}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "d MMM HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{comment.content}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Textarea
              placeholder="Ajouter un commentaire..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px]"
            />
            <Button
              size="icon"
              onClick={() => addCommentMutation.mutate(newComment)}
              disabled={!newComment.trim() || addCommentMutation.isPending}
            >
              {addCommentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
