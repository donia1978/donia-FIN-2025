import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DOMPurify from "dompurify";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { SignaturePad } from "./SignaturePad";
import { FileSignature, Clock, AlertTriangle, CheckCircle2, XCircle, Plus, FileText, Users } from "lucide-react";
import { format, addDays, isPast, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface ConsentTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  version: string;
  is_mandatory: boolean;
  validity_days: number;
}

interface PatientConsent {
  id: string;
  patient_id: string;
  template_id: string;
  consent_text: string;
  signature_data: string;
  signed_at: string;
  expires_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
  consent_templates?: { name: string; category: string; version?: string } | null;
  patients?: { first_name: string; last_name: string } | null;
}

export function ConsentManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<ConsentTemplate | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [hasReadConsent, setHasReadConsent] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<PatientConsent | null>(null);
  const [revocationReason, setRevocationReason] = useState("");

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ["patients-consent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["consent-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consent_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as ConsentTemplate[];
    },
  });

  // Fetch patient consents
  const { data: consents = [] } = useQuery({
    queryKey: ["patient-consents", selectedPatient],
    queryFn: async () => {
      if (!selectedPatient) return [];
      const { data, error } = await supabase
        .from("patient_consents")
        .select(`
          *,
          consent_templates(name, category, version)
        `)
        .eq("patient_id", selectedPatient)
        .order("signed_at", { ascending: false });
      if (error) throw error;
      return data as PatientConsent[];
    },
    enabled: !!selectedPatient,
  });

  // Fetch expiring consents (all patients)
  const { data: expiringConsents = [] } = useQuery({
    queryKey: ["expiring-consents"],
    queryFn: async () => {
      const thirtyDaysFromNow = addDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("patient_consents")
        .select(`
          *,
          consent_templates(name, category),
          patients(first_name, last_name)
        `)
        .is("revoked_at", null)
        .lte("expires_at", thirtyDaysFromNow)
        .order("expires_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data as PatientConsent[];
    },
  });

  // Sign consent mutation
  const signConsentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient || !selectedTemplate || !signatureData || !user) {
        throw new Error("Données manquantes pour la signature");
      }

      const expiresAt = addDays(new Date(), selectedTemplate.validity_days);

      // Create signature hash for verification
      const encoder = new TextEncoder();
      const data = encoder.encode(signatureData + selectedTemplate.content + new Date().toISOString());
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signatureHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const { error } = await supabase.from("patient_consents").insert([{
        patient_id: selectedPatient,
        template_id: selectedTemplate.id,
        consent_text: selectedTemplate.content,
        signature_data: signatureData,
        signature_hash: signatureHash,
        expires_at: expiresAt.toISOString(),
        ip_address: "web-client",
        user_agent: navigator.userAgent.slice(0, 200),
        witness_id: user.id,
        created_by: user.id,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-consents"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-consents"] });
      setSignDialogOpen(false);
      setSelectedTemplate(null);
      setSignatureData(null);
      setHasReadConsent(false);
      toast.success("Consentement signé avec succès");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Revoke consent mutation
  const revokeConsentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConsent) throw new Error("Consentement non sélectionné");

      const { error } = await supabase
        .from("patient_consents")
        .update({
          revoked_at: new Date().toISOString(),
          revocation_reason: revocationReason || "Révoqué par le patient",
        })
        .eq("id", selectedConsent.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-consents"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-consents"] });
      setRevokeDialogOpen(false);
      setSelectedConsent(null);
      setRevocationReason("");
      toast.success("Consentement révoqué");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getConsentStatus = (consent: PatientConsent) => {
    if (consent.revoked_at) return "revoked";
    if (isPast(new Date(consent.expires_at))) return "expired";
    const daysLeft = differenceInDays(new Date(consent.expires_at), new Date());
    if (daysLeft <= 30) return "expiring";
    return "active";
  };

  const statusConfig = {
    active: { label: "Actif", color: "bg-green-500/20 text-green-700", icon: CheckCircle2 },
    expiring: { label: "Expire bientôt", color: "bg-yellow-500/20 text-yellow-700", icon: AlertTriangle },
    expired: { label: "Expiré", color: "bg-red-500/20 text-red-700", icon: Clock },
    revoked: { label: "Révoqué", color: "bg-gray-500/20 text-gray-700", icon: XCircle },
  };

  const categoryLabels: Record<string, string> = {
    general: "Général",
    treatment: "Traitement",
    data_sharing: "Partage de données",
    research: "Recherche",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des consentements</h2>
          <p className="text-muted-foreground">
            Signature électronique et suivi des autorisations patients
          </p>
        </div>
      </div>

      <Tabs defaultValue="sign" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sign">Nouveau consentement</TabsTrigger>
          <TabsTrigger value="history">Historique patient</TabsTrigger>
          <TabsTrigger value="expiring">
            Expirations
            {expiringConsents.length > 0 && (
              <Badge variant="destructive" className="ml-2">{expiringConsents.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sign" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Faire signer un consentement
              </CardTitle>
              <CardDescription>
                Sélectionnez un patient et un type de consentement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.last_name} {patient.first_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {templates.map((template) => (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedTemplate?.id === template.id ? "border-primary ring-2 ring-primary/20" : ""
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <FileText className="h-6 w-6 text-primary" />
                        {template.is_mandatory && (
                          <Badge variant="destructive" className="text-xs">Obligatoire</Badge>
                        )}
                      </div>
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{categoryLabels[template.category]}</span>
                        <span>v{template.version}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Validité : {template.validity_days} jours
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button 
                className="w-full"
                disabled={!selectedPatient || !selectedTemplate}
                onClick={() => setSignDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Procéder à la signature
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Historique des consentements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Patient</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Sélectionner un patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.last_name} {patient.first_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!selectedPatient ? (
                <p className="text-muted-foreground text-center py-8">
                  Sélectionnez un patient pour voir ses consentements
                </p>
              ) : consents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun consentement enregistré
                </p>
              ) : (
                <div className="space-y-3">
                  {consents.map((consent) => {
                    const status = getConsentStatus(consent);
                    const config = statusConfig[status];
                    const StatusIcon = config.icon;

                    return (
                      <div 
                        key={consent.id} 
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <img 
                            src={consent.signature_data} 
                            alt="Signature" 
                            className="w-16 h-10 object-contain border rounded bg-white"
                          />
                          <div>
                            <p className="font-medium">
                              {consent.consent_templates?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Signé le {format(new Date(consent.signed_at), "Pp", { locale: fr })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Expire le {format(new Date(consent.expires_at), "P", { locale: fr })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={config.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          {status === "active" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedConsent(consent);
                                setRevokeDialogOpen(true);
                              }}
                            >
                              Révoquer
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Consentements expirant dans 30 jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringConsents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun consentement n'expire prochainement
                </p>
              ) : (
                <div className="space-y-3">
                  {expiringConsents.map((consent) => {
                    const daysLeft = differenceInDays(new Date(consent.expires_at), new Date());
                    const isExpired = daysLeft < 0;

                    return (
                      <div 
                        key={consent.id} 
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          isExpired ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
                        }`}
                      >
                        <div>
                          <p className="font-medium">
                            {consent.patients?.last_name} {consent.patients?.first_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {consent.consent_templates?.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={isExpired ? "destructive" : "secondary"}>
                            {isExpired 
                              ? `Expiré depuis ${Math.abs(daysLeft)} jours` 
                              : `Expire dans ${daysLeft} jours`}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(consent.expires_at), "P", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sign Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Signature du consentement</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name} - Version {selectedTemplate?.version}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
            <div className="prose prose-sm max-w-none p-4 bg-muted/50 rounded-lg">
                <div dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(
                    (selectedTemplate?.content || "")
                      .replace(/## /g, "<h2>")
                      .replace(/### /g, "<h3>")
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.*?)\*/g, "<em>$1</em>")
                      .replace(/- /g, "<br/>• ")
                      .replace(/\n/g, "<br/>"),
                    { ALLOWED_TAGS: ['h2', 'h3', 'p', 'strong', 'em', 'br', 'ul', 'ol', 'li'], ALLOWED_ATTR: [] }
                  )
                }} />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="read-consent" 
                  checked={hasReadConsent}
                  onCheckedChange={(checked) => setHasReadConsent(checked === true)}
                />
                <label 
                  htmlFor="read-consent" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  J'ai lu et compris le contenu de ce consentement
                </label>
              </div>

              <div className="space-y-2">
                <Label>Signature du patient</Label>
                <SignaturePad onSignatureChange={setSignatureData} />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => signConsentMutation.mutate()}
              disabled={!signatureData || !hasReadConsent || signConsentMutation.isPending}
            >
              <FileSignature className="h-4 w-4 mr-2" />
              Valider la signature
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Révoquer le consentement</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le consentement sera marqué comme révoqué.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motif de révocation (optionnel)</Label>
              <Textarea 
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                placeholder="Précisez la raison..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={() => revokeConsentMutation.mutate()}
              disabled={revokeConsentMutation.isPending}
            >
              Confirmer la révocation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}