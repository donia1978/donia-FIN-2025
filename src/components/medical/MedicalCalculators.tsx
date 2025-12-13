import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, Activity, Heart, Brain, Droplets, Scale, AlertTriangle, Wind, Pill, Smile, Microscope, Scan, Save, History, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { calculatorCategories, getCalculatorById, CalculatorDefinition, CalculatorResult } from "./calculators";
import { CalculationHistory } from "./CalculationHistory";

const iconMap: Record<string, any> = {
  AlertTriangle, Heart, Droplets, Pill, Wind, Brain, Smile, Microscope, Scan, Scale
};

interface Props {
  patientId?: string;
  patientName?: string;
}

export function MedicalCalculators({ patientId, patientName }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"calculator" | "history">("calculator");
  const [selectedCategory, setSelectedCategory] = useState(calculatorCategories[0].id);
  const [selectedCalculator, setSelectedCalculator] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const currentCategory = calculatorCategories.find(c => c.id === selectedCategory);
  const currentCalculator = selectedCalculator ? getCalculatorById(selectedCalculator) : null;

  const handleInputChange = (fieldId: string, value: any) => {
    setInputs(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCalculate = async () => {
    if (!currentCalculator) return;
    try {
      const calcResult = currentCalculator.calculate(inputs);
      setResult(calcResult);
      setAiInterpretation(null);
      toast.success("Calcul effectué avec succès");
      
      // Auto-request AI interpretation
      await requestAIInterpretation(calcResult);
    } catch (error) {
      toast.error("Erreur lors du calcul");
    }
  };

  const requestAIInterpretation = async (calcResult: CalculatorResult) => {
    if (!currentCalculator || !currentCategory) return;
    
    setIsLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('deepseek-medical', {
        body: {
          action: 'interpret_calculation',
          data: {
            calculatorName: currentCalculator.name,
            calculatorCategory: currentCategory.name,
            calculatorDescription: currentCalculator.description,
            inputData: inputs,
            result: calcResult,
            patientContext: patientName ? `Patient: ${patientName}` : undefined
          }
        }
      });

      if (error) throw error;
      
      if (data?.success && data?.content) {
        setAiInterpretation(data.content);
      } else {
        throw new Error(data?.error || "Erreur d'interprétation");
      }
    } catch (error) {
      console.error('AI interpretation error:', error);
      toast.error("Impossible d'obtenir l'interprétation IA");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSaveToPatient = async () => {
    if (!result || !currentCalculator || !user) {
      toast.error("Impossible de sauvegarder");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('medical_calculations').insert({
        patient_id: patientId || null,
        doctor_id: user.id,
        calculation_type: currentCalculator.id,
        input_data: inputs,
        result: result as any,
        ai_interpretation: aiInterpretation
      });

      if (error) throw error;
      toast.success(`Calcul sauvegardé${patientId ? ` pour ${patientName}` : ''}`);
    } catch (error) {
      console.error('Error saving calculation:', error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: CalculatorDefinition['fields'][0]) => {
    switch (field.type) {
      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            step={field.step}
            min={field.min}
            max={field.max}
            value={inputs[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        );
      case 'select':
        return (
          <Select value={inputs[field.id] || ''} onValueChange={(v) => handleInputChange(field.id, v)}>
            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={inputs[field.id] || false}
              onCheckedChange={(checked) => handleInputChange(field.id, checked)}
            />
            <label htmlFor={field.id} className="text-sm cursor-pointer">{field.label}</label>
          </div>
        );
      default:
        return null;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 border-destructive text-destructive';
      case 'high': return 'bg-orange-500/10 border-orange-500 text-orange-600';
      case 'low': return 'bg-yellow-500/10 border-yellow-500 text-yellow-600';
      default: return 'bg-green-500/10 border-green-500 text-green-600';
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "calculator" | "history")} className="h-full">
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Calculateurs Médicaux - Dossier Passion
              {patientName && <span className="text-sm font-normal text-muted-foreground">• {patientName}</span>}
            </CardTitle>
            <TabsList>
              <TabsTrigger value="calculator" className="gap-1">
                <Calculator className="h-4 w-4" />
                Calculer
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1">
                <History className="h-4 w-4" />
                Historique
              </TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TabsContent value="calculator" className="m-0">
            <div className="flex h-[600px]">
          {/* Categories sidebar */}
          <div className="w-48 border-r">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {calculatorCategories.map(cat => {
                  const Icon = iconMap[cat.icon] || Calculator;
                  return (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? "secondary" : "ghost"}
                      className="w-full justify-start text-xs h-8"
                      onClick={() => { setSelectedCategory(cat.id); setSelectedCalculator(null); setResult(null); setAiInterpretation(null); }}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {cat.name}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Calculator list */}
          <div className="w-56 border-r">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {currentCategory?.calculators.map(calc => (
                  <Button
                    key={calc.id}
                    variant={selectedCalculator === calc.id ? "default" : "ghost"}
                    className="w-full justify-start text-xs h-auto py-2 whitespace-normal text-left"
                    onClick={() => { setSelectedCalculator(calc.id); setInputs({}); setResult(null); setAiInterpretation(null); }}
                  >
                    {calc.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Calculator form */}
          <div className="flex-1 p-4">
            {currentCalculator ? (
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-4">
                  <div>
                    <h3 className="font-semibold">{currentCalculator.name}</h3>
                    <p className="text-sm text-muted-foreground">{currentCalculator.description}</p>
                  </div>

                  <div className="space-y-3">
                    {currentCalculator.fields.map(field => (
                      <div key={field.id} className="space-y-1">
                        {field.type !== 'checkbox' && <Label className="text-sm">{field.label}</Label>}
                        {renderField(field)}
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleCalculate} className="w-full" disabled={isLoadingAI}>
                    <Activity className="h-4 w-4 mr-2" />
                    Calculer
                  </Button>

                  {result && (
                    <Card className={`border-2 ${getSeverityColor(result.severity)}`}>
                      <CardContent className="pt-4">
                        <div className="text-center space-y-2">
                          <div className="text-3xl font-bold">{result.value} {result.unit}</div>
                          <p className="font-medium">{result.interpretation}</p>
                          <p className="text-sm opacity-80">Normal: {result.normalRange}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* AI Interpretation Section */}
                  {(isLoadingAI || aiInterpretation) && (
                    <Card className="border-2 border-primary/30 bg-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Interprétation IA DeepSeek
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoadingAI ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                            <span className="text-sm text-muted-foreground">Analyse en cours...</span>
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {aiInterpretation}
                            </div>
                            <p className="text-xs text-muted-foreground mt-4 italic border-t pt-2">
                              ⚠️ Cette interprétation est générée par IA et doit être validée par un professionnel de santé.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {result && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleSaveToPatient}
                        disabled={isSaving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Sauvegarde..." : "Sauvegarder"}
                      </Button>
                      {!aiInterpretation && !isLoadingAI && (
                        <Button
                          variant="secondary"
                          onClick={() => requestAIInterpretation(result)}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Relancer IA
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Calculator className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Sélectionnez un calculateur</p>
                </div>
              </div>
            )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="history" className="m-0 p-4">
          <CalculationHistory patientId={patientId} patientName={patientName} />
        </TabsContent>
      </CardContent>
    </Card>
  </Tabs>
  );
}
