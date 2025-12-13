import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, Phone, Mail, Calendar, Droplet, AlertTriangle, 
  Activity, TrendingUp, TrendingDown, Minus, Heart,
  FileText, Clock, Calculator, Stethoscope
} from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { getCalculatorById, calculatorCategories } from "./calculators";

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
}

interface CalculationRecord {
  id: string;
  calculation_type: string;
  input_data: Record<string, any>;
  result: {
    value: number | string;
    unit: string;
    interpretation: string;
    normalRange: string;
    severity?: string;
  };
  created_at: string;
  ai_interpretation: string | null;
}

interface MedicalRecord {
  id: string;
  record_type: string;
  diagnosis: string | null;
  record_date: string;
}

interface Props {
  patient: Patient;
}

export function PatientSummaryDashboard({ patient }: Props) {
  // Fetch calculations
  const { data: calculations } = useQuery({
    queryKey: ['patient-calculations', patient.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_calculations')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as CalculationRecord[];
    }
  });

  // Fetch medical records
  const { data: records } = useQuery({
    queryKey: ['patient-records-summary', patient.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patient.id)
        .order('record_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as MedicalRecord[];
    }
  });

  // Fetch appointments
  const { data: appointments } = useQuery({
    queryKey: ['patient-appointments-summary', patient.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    }
  });

  const age = patient.date_of_birth 
    ? differenceInYears(new Date(), new Date(patient.date_of_birth))
    : null;

  // Group calculations by type
  const calculationsByType = calculations?.reduce((acc, calc) => {
    if (!acc[calc.calculation_type]) {
      acc[calc.calculation_type] = [];
    }
    acc[calc.calculation_type].push(calc);
    return acc;
  }, {} as Record<string, CalculationRecord[]>) || {};

  // Get critical alerts
  const criticalAlerts = calculations?.filter(
    c => c.result?.severity === 'critical' || c.result?.severity === 'high'
  ).slice(0, 5) || [];

  // Get latest value for each calculation type
  const latestByType = Object.entries(calculationsByType).map(([type, calcs]) => ({
    type,
    latest: calcs[0],
    previous: calcs[1],
    count: calcs.length
  }));

  const getCalculatorName = (type: string) => {
    return getCalculatorById(type)?.name || type;
  };

  const getCategoryName = (type: string) => {
    for (const cat of calculatorCategories) {
      if (cat.calculators.some(c => c.id === type)) {
        return cat.name;
      }
    }
    return "Autre";
  };

  const getTrend = (latest: CalculationRecord, previous?: CalculationRecord) => {
    if (!previous) return null;
    const latestVal = typeof latest.result?.value === 'number' ? latest.result.value : 0;
    const prevVal = typeof previous.result?.value === 'number' ? previous.result.value : 0;
    if (latestVal > prevVal) return 'up';
    if (latestVal < prevVal) return 'down';
    return 'stable';
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'low': return 'bg-yellow-500 text-white';
      default: return 'bg-green-500 text-white';
    }
  };

  // Prepare chart data for most recent calculation types
  const prepareChartData = (type: string) => {
    const typeCalcs = calculationsByType[type] || [];
    return typeCalcs
      .filter(c => typeof c.result?.value === 'number')
      .slice(0, 10)
      .reverse()
      .map(c => ({
        date: format(new Date(c.created_at), 'dd/MM', { locale: fr }),
        value: c.result.value as number,
        interpretation: c.result.interpretation
      }));
  };

  // Get top 3 most tracked indicators
  const topIndicators = Object.entries(calculationsByType)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {patient.first_name[0]}{patient.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{patient.first_name} {patient.last_name}</h2>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {age && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {age} ans
                      </span>
                    )}
                    {patient.gender && (
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {patient.gender === "male" ? "Homme" : patient.gender === "female" ? "Femme" : "Autre"}
                      </span>
                    )}
                    {patient.blood_type && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Droplet className="h-3 w-3" />
                        {patient.blood_type}
                      </Badge>
                    )}
                    {patient.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {patient.phone}
                      </span>
                    )}
                    {patient.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {patient.email}
                      </span>
                    )}
                  </div>
                </div>
                {patient.allergies && patient.allergies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {patient.allergies.map((allergy, i) => (
                      <Badge key={i} variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Calculs</span>
            </div>
            <p className="text-3xl font-bold mt-2">{calculations?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Dossiers</span>
            </div>
            <p className="text-3xl font-bold mt-2">{records?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">RDV à venir</span>
            </div>
            <p className="text-3xl font-bold mt-2">{appointments?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className={criticalAlerts.length > 0 ? 'border-destructive' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${criticalAlerts.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <span className="text-sm text-muted-foreground">Alertes</span>
            </div>
            <p className={`text-3xl font-bold mt-2 ${criticalAlerts.length > 0 ? 'text-destructive' : ''}`}>
              {criticalAlerts.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Alertes Critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalAlerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-2 rounded bg-destructive/10">
                  <div className="flex items-center gap-3">
                    <Badge className={getSeverityColor(alert.result?.severity)}>
                      {alert.result?.severity?.toUpperCase()}
                    </Badge>
                    <span className="font-medium">{getCalculatorName(alert.calculation_type)}</span>
                    <span className="text-lg font-bold">{alert.result?.value} {alert.result?.unit}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(alert.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Calculations with Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Indicateurs Récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-3 pr-4">
                {latestByType.slice(0, 10).map(({ type, latest, previous, count }) => {
                  const trend = getTrend(latest, previous);
                  return (
                    <div key={type} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{getCalculatorName(type)}</span>
                          <Badge variant="outline" className="text-xs">{getCategoryName(type)}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xl font-bold">{latest.result?.value}</span>
                          <span className="text-sm text-muted-foreground">{latest.result?.unit}</span>
                          {trend && (
                            <span className={`p-1 rounded ${
                              trend === 'up' ? 'bg-green-100 text-green-600' :
                              trend === 'down' ? 'bg-red-100 text-red-600' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> :
                               trend === 'down' ? <TrendingDown className="h-3 w-3" /> :
                               <Minus className="h-3 w-3" />}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{latest.result?.interpretation}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getSeverityColor(latest.result?.severity)} variant="secondary">
                          {latest.result?.severity || 'normal'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{count} mesure{count > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  );
                })}
                {latestByType.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Aucun calcul enregistré</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Evolution Charts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Évolution des Indicateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {topIndicators.map(([type]) => {
                const chartData = prepareChartData(type);
                if (chartData.length < 2) return null;
                
                return (
                  <div key={type}>
                    <p className="text-sm font-medium mb-2">{getCalculatorName(type)}</p>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10 }}
                            className="fill-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            className="fill-muted-foreground"
                            width={40}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            fill={`url(#gradient-${type})`}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
              {topIndicators.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Pas assez de données pour afficher les tendances
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Medical Records */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Derniers Dossiers Médicaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {records?.slice(0, 5).map(record => (
                <div key={record.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{record.record_type}</Badge>
                    <span className="text-sm">{record.diagnosis || 'Sans diagnostic'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(record.record_date), 'dd MMM', { locale: fr })}
                  </span>
                </div>
              ))}
              {(!records || records.length === 0) && (
                <p className="text-center text-muted-foreground py-4">Aucun dossier</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              Prochains Rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {appointments?.map(apt => (
                <div key={apt.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{apt.type}</Badge>
                    <span className="text-sm">{apt.location || 'Cabinet'}</span>
                  </div>
                  <span className="text-xs font-medium text-primary">
                    {format(new Date(apt.appointment_date), 'dd MMM HH:mm', { locale: fr })}
                  </span>
                </div>
              ))}
              {(!appointments || appointments.length === 0) && (
                <p className="text-center text-muted-foreground py-4">Aucun rendez-vous à venir</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}