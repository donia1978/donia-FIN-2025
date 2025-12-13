import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, TrendingUp, TrendingDown, Minus, Calendar, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getCalculatorById, calculatorCategories } from "./calculators";

interface Props {
  patientId?: string;
  patientName?: string;
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
  patient_id: string | null;
}

export function CalculationHistory({ patientId, patientName }: Props) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");

  const { data: calculations, isLoading } = useQuery({
    queryKey: ['medical-calculations', patientId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('medical_calculations')
        .select('*')
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      } else if (user) {
        query = query.eq('doctor_id', user.id);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data || []) as unknown as CalculationRecord[];
    },
    enabled: !!user
  });

  const calculationTypes = [...new Set(calculations?.map(c => c.calculation_type) || [])];

  const filteredCalculations = calculations?.filter(
    c => selectedType === "all" || c.calculation_type === selectedType
  ) || [];

  // Prepare chart data for numeric results
  const chartData = filteredCalculations
    .filter(c => typeof c.result?.value === 'number')
    .reverse()
    .map(c => ({
      date: format(new Date(c.created_at), 'dd/MM', { locale: fr }),
      fullDate: format(new Date(c.created_at), 'dd MMM yyyy HH:mm', { locale: fr }),
      value: typeof c.result.value === 'number' ? c.result.value : parseFloat(c.result.value as string) || 0,
      type: c.calculation_type,
      interpretation: c.result.interpretation
    }));

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'warning' as any;
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getTrend = (type: string) => {
    const typeCalcs = calculations?.filter(c => c.calculation_type === type) || [];
    if (typeCalcs.length < 2) return null;
    
    const latest = typeof typeCalcs[0].result?.value === 'number' ? typeCalcs[0].result.value : 0;
    const previous = typeof typeCalcs[1].result?.value === 'number' ? typeCalcs[1].result.value : 0;
    
    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return 'stable';
  };

  const getCalculatorName = (type: string) => {
    const calc = getCalculatorById(type);
    return calc?.name || type;
  };

  const getCategoryName = (type: string) => {
    for (const cat of calculatorCategories) {
      if (cat.calculators.some(c => c.id === type)) {
        return cat.name;
      }
    }
    return "Autre";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historique des Calculs
            {patientName && <span className="text-sm font-normal text-muted-foreground">• {patientName}</span>}
          </CardTitle>
          <div className="flex gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les calculs</SelectItem>
                {calculationTypes.map(type => (
                  <SelectItem key={type} value={type}>{getCalculatorName(type)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "chart" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("chart")}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredCalculations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <History className="h-12 w-12 mb-2 opacity-50" />
            <p>Aucun calcul enregistré</p>
          </div>
        ) : viewMode === "chart" ? (
          <div className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullDate;
                      }
                      return label;
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} - ${props.payload.interpretation}`,
                      getCalculatorName(props.payload.type)
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    name="Valeur"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {calculationTypes.slice(0, 4).map(type => {
                const trend = getTrend(type);
                const typeCalcs = filteredCalculations.filter(c => c.calculation_type === type);
                const latestValue = typeCalcs[0]?.result?.value;
                
                return (
                  <Card key={type} className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground truncate max-w-24">{getCalculatorName(type)}</p>
                        <p className="text-lg font-semibold">{latestValue}</p>
                      </div>
                      {trend && (
                        <div className={`p-1 rounded ${
                          trend === 'up' ? 'bg-green-100 text-green-600' :
                          trend === 'down' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {trend === 'up' ? <TrendingUp className="h-4 w-4" /> :
                           trend === 'down' ? <TrendingDown className="h-4 w-4" /> :
                           <Minus className="h-4 w-4" />}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {typeCalcs.length} calcul{typeCalcs.length > 1 ? 's' : ''}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3 pr-4">
              {filteredCalculations.map(calc => (
                <Card key={calc.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getCalculatorName(calc.calculation_type)}</span>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryName(calc.calculation_type)}
                        </Badge>
                        {calc.result?.severity && (
                          <Badge variant={getSeverityColor(calc.result.severity)}>
                            {calc.result.severity}
                          </Badge>
                        )}
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {calc.result?.value} {calc.result?.unit}
                      </div>
                      <p className="text-sm text-muted-foreground">{calc.result?.interpretation}</p>
                      <p className="text-xs text-muted-foreground">Normal: {calc.result?.normalRange}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(calc.created_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(calc.created_at), 'HH:mm', { locale: fr })}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
