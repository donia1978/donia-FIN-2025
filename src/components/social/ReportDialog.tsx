import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Flag } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ReportDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam ou publicité non sollicitée" },
  { value: "harassment", label: "Harcèlement ou intimidation" },
  { value: "hate_speech", label: "Discours haineux ou discriminatoire" },
  { value: "misinformation", label: "Fausses informations" },
  { value: "inappropriate", label: "Contenu inapproprié ou offensant" },
  { value: "other", label: "Autre raison" }
];

export function ReportDialog({ postId, open, onOpenChange }: ReportDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !reason) throw new Error("Données manquantes");
      
      const { error } = await supabase
        .from("post_reports")
        .insert({
          post_id: postId,
          user_id: user.id,
          reason,
          details: details.trim() || null
        });
      
      if (error) {
        if (error.code === "23505") {
          throw new Error("Vous avez déjà signalé cette publication");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Signalement envoyé. Merci de votre vigilance.");
      setReason("");
      setDetails("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erreur lors du signalement");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Signaler cette publication
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Raison du signalement</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {reason === "other" && (
            <div className="space-y-2">
              <Label>Détails supplémentaires</Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Décrivez le problème..."
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => reportMutation.mutate()}
              disabled={!reason || reportMutation.isPending}
            >
              {reportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Signaler"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
