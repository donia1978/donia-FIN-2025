import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stethoscope, Calendar, FileText, Users, Clock, FolderOpen, Calculator, Sparkles, CalendarDays, LayoutDashboard, Bell, Share2 } from "lucide-react";
import { PatientsList } from "@/components/medical/PatientsList";
import { PatientDetails } from "@/components/medical/PatientDetails";
import { PatientSummaryDashboard } from "@/components/medical/PatientSummaryDashboard";
import { MedicalCalculators } from "@/components/medical/MedicalCalculators";
import { AIPrescriptionAssistant } from "@/components/medical/AIPrescriptionAssistant";
import { AppointmentScheduler } from "@/components/medical/AppointmentScheduler";
import { RemindersDashboard } from "@/components/medical/RemindersDashboard";
import { InteroperabilityDashboard } from "@/components/medical/InteroperabilityDashboard";
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

export default function Medical() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [patientViewMode, setPatientViewMode] = useState<"details" | "dashboard">("details");

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

  const { data: todayAppointments } = useQuery({
    queryKey: ["today-appointments"],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:patients(first_name, last_name)
        `)
        .gte("appointment_date", startOfDay.toISOString())
        .lte("appointment_date", endOfDay.toISOString())
        .order("appointment_date", { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Module Médical Avancé</h1>
            <p className="text-muted-foreground">Gestion des dossiers patients, RDV et outils IA</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-7 w-full max-w-5xl">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="appointments">
              <CalendarDays className="h-4 w-4 mr-2" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="reminders">
              <Bell className="h-4 w-4 mr-2" />
              Rappels
            </TabsTrigger>
            <TabsTrigger value="patients">
              <FolderOpen className="h-4 w-4 mr-2" />
              Patients
            </TabsTrigger>
            <TabsTrigger value="calculators">
              <Calculator className="h-4 w-4 mr-2" />
              Calculateurs
            </TabsTrigger>
            <TabsTrigger value="interop">
              <Share2 className="h-4 w-4 mr-2" />
              HL7/FHIR
            </TabsTrigger>
            <TabsTrigger value="ai-assistant">
              <Sparkles className="h-4 w-4 mr-2" />
              IA
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
              <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">IA DeepSeek</CardTitle>
                  <Sparkles className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">Actif</div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>Rendez-vous du jour</CardTitle>
                <CardDescription>Liste des consultations programmées</CardDescription>
              </CardHeader>
              <CardContent>
                {todayAppointments && todayAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {todayAppointments.map((apt: any) => (
                      <div key={apt.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                          <div className="rounded-full bg-green-500/10 p-2">
                            <Stethoscope className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {apt.patient?.first_name} {apt.patient?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{apt.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(apt.appointment_date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                            apt.status === 'confirmed' 
                              ? 'bg-green-500/10 text-green-500' 
                              : apt.status === 'completed'
                              ? 'bg-gray-500/10 text-gray-500'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            {apt.status === 'scheduled' ? 'Planifié' : 
                             apt.status === 'confirmed' ? 'Confirmé' :
                             apt.status === 'completed' ? 'Terminé' : apt.status}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedPatient(apt.patient);
                            setActiveTab("patients");
                          }}>Voir</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Aucun rendez-vous programmé pour aujourd'hui</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="mt-6">
            <AppointmentScheduler />
          </TabsContent>

          <TabsContent value="reminders" className="mt-6">
            <RemindersDashboard />
          </TabsContent>

          <TabsContent value="patients" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <PatientsList
                  onSelectPatient={(patient) => {
                    setSelectedPatient(patient);
                    setPatientViewMode("details");
                  }}
                  selectedPatientId={selectedPatient?.id}
                />
              </div>
              <div className="lg:col-span-2">
                {selectedPatient ? (
                  <div className="space-y-4">
                    {/* View Mode Toggle */}
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant={patientViewMode === "details" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPatientViewMode("details")}
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Dossier
                      </Button>
                      <Button
                        variant={patientViewMode === "dashboard" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPatientViewMode("dashboard")}
                      >
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Synthèse
                      </Button>
                    </div>
                    
                    {patientViewMode === "details" ? (
                      <PatientDetails patient={selectedPatient} />
                    ) : (
                      <PatientSummaryDashboard patient={selectedPatient} />
                    )}
                  </div>
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

          <TabsContent value="calculators" className="mt-6">
            <MedicalCalculators />
          </TabsContent>

          <TabsContent value="interop" className="mt-6">
            <InteroperabilityDashboard />
          </TabsContent>

          <TabsContent value="ai-assistant" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AIPrescriptionAssistant 
                patientId={selectedPatient?.id}
                patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : undefined}
                allergies={selectedPatient?.allergies || []}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Fonctionnalités IA DeepSeek
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100">
                    <h4 className="font-medium mb-2">Analyse de symptômes</h4>
                    <p className="text-sm text-muted-foreground">
                      Diagnostic différentiel assisté par IA basé sur les symptômes décrits.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-teal-50 border border-green-100">
                    <h4 className="font-medium mb-2">Suggestions de prescription</h4>
                    <p className="text-sm text-muted-foreground">
                      Propositions de traitements adaptées au pays du patient (avec validation obligatoire).
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                    <h4 className="font-medium mb-2">Rappels intelligents</h4>
                    <p className="text-sm text-muted-foreground">
                      Messages de rappel personnalisés générés par IA pour les patients.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100">
                    <h4 className="font-medium mb-2">Interprétation des résultats</h4>
                    <p className="text-sm text-muted-foreground">
                      Explication des résultats des calculateurs médicaux en langage clair.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
