import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Send, Download, Shield, FileJson, Activity, Plus, History } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface HealthcareFacility {
  id: string;
  name: string;
  type: string;
  city: string;
  country: string;
  fhir_endpoint: string | null;
  is_active: boolean;
}

interface DataExchange {
  id: string;
  patient_id: string;
  exchange_type: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  source_facility: { name: string; type: string } | null;
  destination_facility: { name: string; type: string } | null;
}

export function InteroperabilityDashboard() {
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [newFacilityOpen, setNewFacilityOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"fhir" | "hl7">("fhir");
  const [exportedData, setExportedData] = useState<string>("");

  // Fetch facilities
  const { data: facilities = [] } = useQuery({
    queryKey: ["healthcare-facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("healthcare_facilities")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as HealthcareFacility[];
    },
  });

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ["patients-interop"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch exchanges
  const { data: exchanges = [] } = useQuery({
    queryKey: ["data-exchanges", selectedPatient],
    queryFn: async () => {
      if (!selectedPatient) return [];
      const { data, error } = await supabase.functions.invoke("fhir-exchange", {
        body: { action: "get_exchanges", patientId: selectedPatient },
      });
      if (error) throw error;
      return (data?.exchanges || []) as DataExchange[];
    },
    enabled: !!selectedPatient,
  });

  // Add facility mutation
  const addFacilityMutation = useMutation({
    mutationFn: async (facility: { name: string; type: string; city?: string; country?: string; fhir_endpoint?: string | null }) => {
      const { error } = await supabase.from("healthcare_facilities").insert([facility]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healthcare-facilities"] });
      setNewFacilityOpen(false);
      toast.success("Établissement ajouté");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Export FHIR/HL7
  const exportMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fhir-exchange", {
        body: { 
          action: "export_patient", 
          patientId: selectedPatient,
          format: exportFormat 
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const content = exportFormat === "fhir" 
        ? JSON.stringify(data.fhir, null, 2)
        : data.hl7;
      setExportedData(content);
      toast.success(`Export ${exportFormat.toUpperCase()} généré (${data.resourceCount} ressources)`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Send to facility
  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fhir-exchange", {
        body: { 
          action: "send_to_facility", 
          patientId: selectedPatient,
          facilityId: selectedFacility,
          exchangeType: "patient_summary"
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["data-exchanges"] });
      toast.success(`Données envoyées à ${data.facility}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAddFacility = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addFacilityMutation.mutate({
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      city: formData.get("city") as string,
      country: formData.get("country") as string,
      fhir_endpoint: formData.get("fhir_endpoint") as string || null,
    });
  };

  const facilityTypeLabels: Record<string, string> = {
    hospital: "Hôpital",
    clinic: "Clinique",
    laboratory: "Laboratoire",
    pharmacy: "Pharmacie",
    imaging_center: "Centre d'imagerie",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-700",
    sent: "bg-blue-500/20 text-blue-700",
    received: "bg-green-500/20 text-green-700",
    acknowledged: "bg-green-600/20 text-green-800",
    failed: "bg-red-500/20 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Interopérabilité HL7/FHIR</h2>
          <p className="text-muted-foreground">
            Échange sécurisé de données médicales entre établissements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <FileJson className="h-3 w-3" />
            FHIR R4
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            HL7 v2.5
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="exchange" className="space-y-4">
        <TabsList>
          <TabsTrigger value="exchange">Échange de données</TabsTrigger>
          <TabsTrigger value="facilities">Établissements partenaires</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="exchange" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Exporter / Transférer des données patient
              </CardTitle>
              <CardDescription>
                Générez un bundle FHIR ou un message HL7 pour partager les données
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="space-y-2">
                  <Label>Format d'export</Label>
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "fhir" | "hl7")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fhir">FHIR R4 (JSON)</SelectItem>
                      <SelectItem value="hl7">HL7 v2.5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Établissement destinataire (optionnel)</Label>
                  <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                    <SelectTrigger>
                      <SelectValue placeholder="Export local uniquement" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id}>
                          {facility.name} ({facilityTypeLabels[facility.type]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => exportMutation.mutate()}
                  disabled={!selectedPatient || exportMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Générer l'export
                </Button>
                {selectedFacility && (
                  <Button 
                    variant="secondary"
                    onClick={() => sendMutation.mutate()}
                    disabled={!selectedPatient || sendMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer à l'établissement
                  </Button>
                )}
              </div>

              {exportedData && (
                <div className="space-y-2">
                  <Label>Données exportées</Label>
                  <Textarea 
                    value={exportedData} 
                    readOnly 
                    className="font-mono text-xs h-64"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(exportedData);
                      toast.success("Copié dans le presse-papiers");
                    }}
                  >
                    Copier
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facilities" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={newFacilityOpen} onOpenChange={setNewFacilityOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un établissement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvel établissement partenaire</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddFacility} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select name="type" defaultValue="hospital">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hospital">Hôpital</SelectItem>
                        <SelectItem value="clinic">Clinique</SelectItem>
                        <SelectItem value="laboratory">Laboratoire</SelectItem>
                        <SelectItem value="pharmacy">Pharmacie</SelectItem>
                        <SelectItem value="imaging_center">Centre d'imagerie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Ville</Label>
                      <Input id="city" name="city" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Pays</Label>
                      <Input id="country" name="country" defaultValue="FR" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fhir_endpoint">Endpoint FHIR (optionnel)</Label>
                    <Input id="fhir_endpoint" name="fhir_endpoint" placeholder="https://..." />
                  </div>
                  <Button type="submit" className="w-full" disabled={addFacilityMutation.isPending}>
                    Ajouter
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {facilities.map((facility) => (
              <Card key={facility.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Building2 className="h-8 w-8 text-primary" />
                    <Badge variant="secondary">{facilityTypeLabels[facility.type]}</Badge>
                  </div>
                  <CardTitle className="text-lg">{facility.name}</CardTitle>
                  <CardDescription>
                    {facility.city}, {facility.country}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {facility.fhir_endpoint ? (
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        FHIR activé
                      </Badge>
                    ) : (
                      <span>Export manuel uniquement</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique des échanges
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedPatient ? (
                <p className="text-muted-foreground text-center py-8">
                  Sélectionnez un patient pour voir l'historique des échanges
                </p>
              ) : exchanges.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun échange pour ce patient
                </p>
              ) : (
                <div className="space-y-3">
                  {exchanges.map((exchange) => (
                    <div 
                      key={exchange.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {exchange.destination_facility?.name || "Export local"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {exchange.exchange_type} • {format(new Date(exchange.created_at), "Pp", { locale: fr })}
                        </p>
                      </div>
                      <Badge className={statusColors[exchange.status]}>
                        {exchange.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}