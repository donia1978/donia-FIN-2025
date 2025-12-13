import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stethoscope, Calendar, FileText, Users, Plus, Clock, FolderOpen } from "lucide-react";
import { PatientsList } from "@/components/medical/PatientsList";
import { PatientDetails } from "@/components/medical/PatientDetails";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

const appointments = [
  { id: 1, patient: "Marie Dupont", time: "09:00", type: "Consultation", status: "confirmé" },
  { id: 2, patient: "Jean Martin", time: "10:30", type: "Suivi", status: "en attente" },
  { id: 3, patient: "Sophie Bernard", time: "14:00", type: "Examen", status: "confirmé" },
  { id: 4, patient: "Pierre Durand", time: "15:30", type: "Consultation", status: "confirmé" },
];

export default function Medical() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats } = useQuery({
    queryKey: ["medical-stats"],
    queryFn: async () => {
      const [patientsRes, recordsRes, appointmentsRes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("medical_records").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).gte("appointment_date", new Date().toISOString().split("T")[0])
      ]);
      return {
        patients: patientsRes.count || 0,
        records: recordsRes.count || 0,
        appointments: appointmentsRes.count || 0
      };
    }
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Médical</h1>
            <p className="text-muted-foreground">Gestion des dossiers patients et rendez-vous</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau rendez-vous
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="patients">
              <FolderOpen className="h-4 w-4 mr-2" />
              Dossiers patients
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">RDV aujourd'hui</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.appointments || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Patients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.patients || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Dossiers</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.records || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Consultations/mois</CardTitle>
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                </CardContent>
              </Card>
            </div>

            {/* Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>Rendez-vous du jour</CardTitle>
                <CardDescription>Liste des consultations programmées</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-green-500/10 p-2">
                          <Stethoscope className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">{apt.patient}</p>
                          <p className="text-sm text-muted-foreground">{apt.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{apt.time}</span>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          apt.status === 'confirmé' 
                            ? 'bg-green-500/10 text-green-500' 
                            : 'bg-orange-500/10 text-orange-500'
                        }`}>
                          {apt.status}
                        </span>
                        <Button variant="outline" size="sm">Voir</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <PatientsList
                  onSelectPatient={setSelectedPatient}
                  selectedPatientId={selectedPatient?.id}
                />
              </div>
              <div className="lg:col-span-2">
                {selectedPatient ? (
                  <PatientDetails patient={selectedPatient} />
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center text-muted-foreground py-12">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Sélectionnez un patient pour voir son dossier</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
