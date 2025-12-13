import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, AlertTriangle, Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIPrescriptionProps {
  patientId?: string;
  patientName?: string;
  allergies?: string[];
}

export function AIPrescriptionAssistant({ patientId, patientName, allergies = [] }: AIPrescriptionProps) {
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [country, setCountry] = useState("France");
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionId, setSuggestionId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!symptoms.trim()) {
      toast.error("Veuillez entrer les symptômes du patient");
      return;
    }

    setIsGenerating(true);
    setSuggestion(null);

    try {
      const { data, error } = await supabase.functions.invoke("deepseek-medical", {
        body: {
          action: "generate_prescription",
          data: {
            patientName: patientName || "Patient anonyme",
            symptoms: symptoms.split(",").map(s => s.trim()),
            diagnosis: diagnosis || undefined,
            country,
            allergies,
          }
        }
      });

      if (error) throw error;

      if (data.success && data.content) {
        setSuggestion(data.content);
        
        // Save to database for audit trail
        const { data: user } = await supabase.auth.getUser();
        if (user?.user) {
          const { data: insertedSuggestion, error: insertError } = await supabase
            .from("ai_prescription_suggestions")
            .insert({
              patient_id: patientId || null,
              doctor_id: user.user.id,
              symptoms: symptoms.split(",").map(s => s.trim()),
              diagnosis: diagnosis || null,
              ai_suggestion: data.content,
              status: "pending"
            })
            .select()
            .single();

          if (!insertError && insertedSuggestion) {
            setSuggestionId(insertedSuggestion.id);
          }
        }
        
        toast.success("Suggestion générée avec succès");
      } else {
        throw new Error(data.error || "Erreur lors de la génération");
      }
    } catch (error) {
      console.error("AI Prescription error:", error);
      toast.error("Erreur lors de la génération de la suggestion");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleValidation = async (validated: boolean, reason?: string) => {
    if (!suggestionId) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      await supabase
        .from("ai_prescription_suggestions")
        .update({
          status: validated ? "validated" : "rejected",
          validated_by: validated ? user?.user?.id : null,
          validated_at: validated ? new Date().toISOString() : null,
          rejection_reason: reason || null,
        })
        .eq("id", suggestionId);

      toast.success(validated ? "Suggestion validée" : "Suggestion rejetée");
      if (validated) {
        setSuggestion(null);
        setSuggestionId(null);
      }
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Erreur lors de la validation");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Assistant IA - Suggestion de Prescription
          <Badge variant="outline" className="ml-2">DeepSeek</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive" className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Avertissement :</strong> Les suggestions générées par IA sont des aides à la décision et doivent être validées par un médecin qualifié. Ne jamais prescrire sans validation humaine.
          </AlertDescription>
        </Alert>

        {patientName && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm"><strong>Patient :</strong> {patientName}</p>
            {allergies.length > 0 && (
              <p className="text-sm text-destructive">
                <strong>Allergies :</strong> {allergies.join(", ")}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Symptômes (séparés par des virgules)</Label>
          <Textarea
            placeholder="Fièvre, toux sèche, fatigue, maux de tête..."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Diagnostic (optionnel)</Label>
          <Input
            placeholder="Ex: Infection respiratoire haute"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Pays du patient</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="France">France</SelectItem>
              <SelectItem value="Belgique">Belgique</SelectItem>
              <SelectItem value="Suisse">Suisse</SelectItem>
              <SelectItem value="Canada">Canada</SelectItem>
              <SelectItem value="Maroc">Maroc</SelectItem>
              <SelectItem value="Tunisie">Tunisie</SelectItem>
              <SelectItem value="Algérie">Algérie</SelectItem>
              <SelectItem value="Sénégal">Sénégal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || !symptoms.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Générer une suggestion
            </>
          )}
        </Button>

        {suggestion && (
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Suggestion IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
                {suggestion}
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="default" 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleValidation(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Valider la suggestion
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => handleValidation(false, "Rejeté par le médecin")}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
