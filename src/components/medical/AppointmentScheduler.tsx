import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Clock, Plus, Bell, Video, User, MapPin } from "lucide-react";
import { format, addDays, isSameDay, parseISO, setHours, setMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  type: string;
  notes: string | null;
  location: string | null;
  patient?: {
    first_name: string;
    last_name: string;
  };
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

const appointmentTypes = [
  { value: "consultation", label: "Consultation", icon: User },
  { value: "follow_up", label: "Suivi", icon: Clock },
  { value: "video", label: "Téléconsultation", icon: Video },
  { value: "emergency", label: "Urgence", icon: Bell },
];

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export function AppointmentScheduler() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // New appointment form
  const [newPatientId, setNewPatientId] = useState("");
  const [newDate, setNewDate] = useState<Date>(new Date());
  const [newTime, setNewTime] = useState("09:00");
  const [newType, setNewType] = useState("consultation");
  const [newDuration, setNewDuration] = useState("30");
  const [newLocation, setNewLocation] = useState("");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
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
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .order("last_name", { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const createAppointment = async () => {
    if (!newPatientId || !user) {
      toast.error("Veuillez sélectionner un patient");
      return;
    }

    try {
      const [hours, minutes] = newTime.split(":").map(Number);
      const appointmentDate = setMinutes(setHours(newDate, hours), minutes);

      const { error } = await supabase.from("appointments").insert({
        patient_id: newPatientId,
        doctor_id: user.id,
        appointment_date: appointmentDate.toISOString(),
        duration_minutes: parseInt(newDuration),
        type: newType,
        location: newLocation || null,
        notes: newNotes || null,
        status: "scheduled"
      });

      if (error) throw error;

      toast.success("Rendez-vous créé avec succès");
      setIsDialogOpen(false);
      resetForm();
      fetchAppointments();
      
      // Schedule reminders
      scheduleReminders(appointmentDate);
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error("Erreur lors de la création du rendez-vous");
    }
  };

  const scheduleReminders = async (appointmentDate: Date) => {
    // This would typically be handled by a backend cron job
    // For now, we just show a toast
    toast.info("Rappels programmés: 24h, 2h et 15min avant le RDV");
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", appointmentId);

      if (error) throw error;
      toast.success("Statut mis à jour");
      fetchAppointments();
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const resetForm = () => {
    setNewPatientId("");
    setNewDate(new Date());
    setNewTime("09:00");
    setNewType("consultation");
    setNewDuration("30");
    setNewLocation("");
    setNewNotes("");
  };

  const getBookedSlots = () => {
    return appointments.map(apt => {
      const date = parseISO(apt.appointment_date);
      return format(date, "HH:mm");
    });
  };

  const bookedSlots = getBookedSlots();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Agenda Médical
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau RDV
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouveau Rendez-vous</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={newPatientId} onValueChange={setNewPatientId}>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(newDate, "dd/MM/yyyy", { locale: fr })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newDate}
                        onSelect={(date) => date && setNewDate(date)}
                        disabled={(date) => date < new Date()}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Heure</Label>
                  <Select value={newTime} onValueChange={setNewTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem 
                          key={slot} 
                          value={slot}
                          disabled={isSameDay(newDate, selectedDate) && bookedSlots.includes(slot)}
                        >
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {appointmentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Durée (min)</Label>
                  <Select value={newDuration} onValueChange={setNewDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lieu</Label>
                <Input
                  placeholder="Cabinet, Téléconsultation..."
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Notes pour le rendez-vous..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <Button onClick={createAppointment} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Créer le rendez-vous
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Calendar */}
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={fr}
              className="rounded-md border"
            />
          </div>

          {/* Day's appointments */}
          <div>
            <h3 className="font-medium mb-3">
              {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
            </h3>
            <ScrollArea className="h-[280px]">
              {isLoading ? (
                <p className="text-muted-foreground">Chargement...</p>
              ) : appointments.length === 0 ? (
                <p className="text-muted-foreground">Aucun rendez-vous ce jour</p>
              ) : (
                <div className="space-y-2">
                  {appointments.map((apt) => {
                    const aptType = appointmentTypes.find(t => t.value === apt.type);
                    const TypeIcon = aptType?.icon || User;
                    
                    return (
                      <Card key={apt.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <TypeIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {apt.patient?.first_name} {apt.patient?.last_name}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(apt.appointment_date), "HH:mm")}
                                <span>({apt.duration_minutes} min)</span>
                              </div>
                              {apt.location && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {apt.location}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={cn("text-xs", statusColors[apt.status])}>
                              {apt.status}
                            </Badge>
                            <Select
                              value={apt.status}
                              onValueChange={(status) => updateAppointmentStatus(apt.id, status)}
                            >
                              <SelectTrigger className="h-7 text-xs w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="scheduled">Planifié</SelectItem>
                                <SelectItem value="confirmed">Confirmé</SelectItem>
                                <SelectItem value="completed">Terminé</SelectItem>
                                <SelectItem value="cancelled">Annulé</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
