import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, Phone, Mail, Calendar, Droplet, AlertTriangle, 
  Plus, FileText, Stethoscope, Pill, Clock 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
  phone: string | null;
  email: string | null;
  allergies: string[] | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

interface MedicalRecord {
  id: string;
  record_type: string;
  diagnosis: string | null;
  symptoms: string[] | null;
  treatment: string | null;
  prescription: string | null;
  notes: string | null;
  record_date: string;
}

interface PatientDetailsProps {
  patient: Patient;
}

export function PatientDetails({ patient }: PatientDetailsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    record_type: "consultation",
    diagnosis: "",
    symptoms: "",
    treatment: "",
    prescription: "",
    notes: ""
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["medical-records", patient.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_records")
        .select("*")
        .eq("patient_id", patient.id)
        .order("record_date", { ascending: false });
      if (error) throw error;
      return data as MedicalRecord[];
    }
  });

  const createRecordMutation = useMutation({
    mutationFn: async (record: typeof newRecord) => {
      const { error } = await supabase.from("medical_records").insert({
        patient_id: patient.id,
        doctor_id: user!.id,
        record_type: record.record_type,
        diagnosis: record.diagnosis || null,
        symptoms: record.symptoms ? record.symptoms.split(",").map(s => s.trim()) : null,
        treatment: record.treatment || null,
        prescription: record.prescription || null,
        notes: record.notes || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-records", patient.id] });
      setIsRecordDialogOpen(false);
      setNewRecord({ record_type: "consultation", diagnosis: "", symptoms: "", treatment: "", prescription: "", notes: "" });
      toast.success("Dossier médical ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout")
  });

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case "consultation": return <Stethoscope className="h-4 w-4" />;
      case "prescription": return <Pill className="h-4 w-4" />;
      case "examination": return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getRecordTypeLabel = (type: string) => {
    switch (type) {
      case "consultation": return "Consultation";
      case "prescription": return "Prescription";
      case "examination": return "Examen";
      case "surgery": return "Chirurgie";
      case "follow_up": return "Suivi";
      default: return type;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {patient.first_name[0]}{patient.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">
                {patient.first_name} {patient.last_name}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 mt-1">
                {patient.date_of_birth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(patient.date_of_birth), "d MMMM yyyy", { locale: fr })}
                  </span>
                )}
                {patient.gender && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {patient.gender === "male" ? "Homme" : patient.gender === "female" ? "Femme" : "Autre"}
                  </span>
                )}
                {patient.blood_type && (
                  <span className="flex items-center gap-1">
                    <Droplet className="h-3 w-3" />
                    {patient.blood_type}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau dossier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouveau dossier médical</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Type de dossier</Label>
                  <Select
                    value={newRecord.record_type}
                    onValueChange={(v) => setNewRecord({ ...newRecord, record_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="examination">Examen</SelectItem>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="surgery">Chirurgie</SelectItem>
                      <SelectItem value="follow_up">Suivi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Diagnostic</Label>
                  <Input
                    value={newRecord.diagnosis}
                    onChange={(e) => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
                    placeholder="Diagnostic principal"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Symptômes (séparés par des virgules)</Label>
                  <Input
                    value={newRecord.symptoms}
                    onChange={(e) => setNewRecord({ ...newRecord, symptoms: e.target.value })}
                    placeholder="Fièvre, toux, fatigue..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Traitement</Label>
                  <Textarea
                    value={newRecord.treatment}
                    onChange={(e) => setNewRecord({ ...newRecord, treatment: e.target.value })}
                    placeholder="Description du traitement prescrit"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prescription</Label>
                  <Textarea
                    value={newRecord.prescription}
                    onChange={(e) => setNewRecord({ ...newRecord, prescription: e.target.value })}
                    placeholder="Médicaments prescrits"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newRecord.notes}
                    onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                    placeholder="Notes additionnelles"
                  />
                </div>
                <Button
                  onClick={() => createRecordMutation.mutate(newRecord)}
                  disabled={createRecordMutation.isPending}
                >
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="records">Dossiers ({records?.length || 0})</TabsTrigger>
            <TabsTrigger value="allergies">Allergies</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {patient.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.email}</span>
                </div>
              )}
            </div>
            {patient.address && (
              <div className="text-sm">
                <p className="font-medium mb-1">Adresse</p>
                <p className="text-muted-foreground">{patient.address}</p>
              </div>
            )}
            {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
              <div className="text-sm border-t pt-4">
                <p className="font-medium mb-1 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Contact d'urgence
                </p>
                <p className="text-muted-foreground">
                  {patient.emergency_contact_name} - {patient.emergency_contact_phone}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="records" className="mt-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">Chargement...</p>
            ) : records?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Aucun dossier médical</p>
            ) : (
              <div className="space-y-3">
                {records?.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRecordTypeIcon(record.record_type)}
                        <Badge variant="outline">{getRecordTypeLabel(record.record_type)}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(record.record_date), "d MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    {record.diagnosis && (
                      <div>
                        <p className="text-sm font-medium">Diagnostic</p>
                        <p className="text-sm text-muted-foreground">{record.diagnosis}</p>
                      </div>
                    )}
                    {record.symptoms && record.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {record.symptoms.map((symptom, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {symptom}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {record.treatment && (
                      <div>
                        <p className="text-sm font-medium">Traitement</p>
                        <p className="text-sm text-muted-foreground">{record.treatment}</p>
                      </div>
                    )}
                    {record.prescription && (
                      <div>
                        <p className="text-sm font-medium">Prescription</p>
                        <p className="text-sm text-muted-foreground">{record.prescription}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="allergies" className="mt-4">
            {patient.allergies && patient.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {patient.allergies.map((allergy, i) => (
                  <Badge key={i} variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {allergy}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Aucune allergie enregistrée</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
