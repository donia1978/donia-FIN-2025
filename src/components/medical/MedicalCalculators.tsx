import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Activity, Heart, Brain, Droplets, Scale } from "lucide-react";
import { toast } from "sonner";

interface CalculatorResult {
  value: number | string;
  unit: string;
  interpretation: string;
  normalRange: string;
}

const calculators = [
  { id: "bmi", name: "IMC (Indice de Masse Corporelle)", icon: Scale, category: "general" },
  { id: "gfr", name: "DFG (Débit de Filtration Glomérulaire)", icon: Droplets, category: "renal" },
  { id: "creatinine_clearance", name: "Clairance Créatinine (Cockcroft-Gault)", icon: Droplets, category: "renal" },
  { id: "cardiac_risk", name: "Score de Risque Cardiovasculaire", icon: Heart, category: "cardiac" },
  { id: "glasgow", name: "Score de Glasgow", icon: Brain, category: "neuro" },
];

export function MedicalCalculators() {
  const [selectedCalculator, setSelectedCalculator] = useState("bmi");
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  
  // BMI inputs
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  
  // GFR inputs
  const [age, setAge] = useState("");
  const [creatinine, setCreatinine] = useState("");
  const [gender, setGender] = useState("male");
  const [race, setRace] = useState("other");

  // Glasgow inputs
  const [eyeResponse, setEyeResponse] = useState("4");
  const [verbalResponse, setVerbalResponse] = useState("5");
  const [motorResponse, setMotorResponse] = useState("6");

  const calculateBMI = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100; // Convert cm to m
    if (isNaN(w) || isNaN(h) || h === 0) {
      toast.error("Veuillez entrer des valeurs valides");
      return;
    }
    
    const bmi = w / (h * h);
    let interpretation = "";
    
    if (bmi < 18.5) interpretation = "Insuffisance pondérale";
    else if (bmi < 25) interpretation = "Poids normal";
    else if (bmi < 30) interpretation = "Surpoids";
    else if (bmi < 35) interpretation = "Obésité classe I";
    else if (bmi < 40) interpretation = "Obésité classe II";
    else interpretation = "Obésité classe III (morbide)";

    setResult({
      value: bmi.toFixed(1),
      unit: "kg/m²",
      interpretation,
      normalRange: "18.5 - 24.9 kg/m²"
    });
  };

  const calculateGFR = () => {
    const a = parseFloat(age);
    const cr = parseFloat(creatinine);
    if (isNaN(a) || isNaN(cr) || cr === 0) {
      toast.error("Veuillez entrer des valeurs valides");
      return;
    }

    // CKD-EPI formula (simplified)
    let gfr = 141 * Math.pow(Math.min(cr / (gender === "female" ? 0.7 : 0.9), 1), gender === "female" ? -0.329 : -0.411)
            * Math.pow(Math.max(cr / (gender === "female" ? 0.7 : 0.9), 1), -1.209)
            * Math.pow(0.993, a)
            * (gender === "female" ? 1.018 : 1)
            * (race === "black" ? 1.159 : 1);

    let interpretation = "";
    if (gfr >= 90) interpretation = "Fonction rénale normale (G1)";
    else if (gfr >= 60) interpretation = "Insuffisance rénale légère (G2)";
    else if (gfr >= 45) interpretation = "Insuffisance rénale modérée (G3a)";
    else if (gfr >= 30) interpretation = "Insuffisance rénale modérée (G3b)";
    else if (gfr >= 15) interpretation = "Insuffisance rénale sévère (G4)";
    else interpretation = "Insuffisance rénale terminale (G5)";

    setResult({
      value: gfr.toFixed(1),
      unit: "mL/min/1.73m²",
      interpretation,
      normalRange: "≥ 90 mL/min/1.73m²"
    });
  };

  const calculateGlasgow = () => {
    const eye = parseInt(eyeResponse);
    const verbal = parseInt(verbalResponse);
    const motor = parseInt(motorResponse);
    const total = eye + verbal + motor;

    let interpretation = "";
    if (total >= 13) interpretation = "Traumatisme crânien léger";
    else if (total >= 9) interpretation = "Traumatisme crânien modéré";
    else if (total >= 3) interpretation = "Traumatisme crânien sévère";

    setResult({
      value: total,
      unit: "/15",
      interpretation,
      normalRange: "15/15 (conscience normale)"
    });
  };

  const handleCalculate = () => {
    setIsCalculating(true);
    try {
      switch (selectedCalculator) {
        case "bmi":
          calculateBMI();
          break;
        case "gfr":
        case "creatinine_clearance":
          calculateGFR();
          break;
        case "glasgow":
          calculateGlasgow();
          break;
        default:
          toast.error("Calculateur non implémenté");
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const renderInputs = () => {
    switch (selectedCalculator) {
      case "bmi":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Poids (kg)</Label>
              <Input 
                type="number" 
                placeholder="70" 
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Taille (cm)</Label>
              <Input 
                type="number" 
                placeholder="175" 
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
          </div>
        );
      
      case "gfr":
      case "creatinine_clearance":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Âge (ans)</Label>
              <Input 
                type="number" 
                placeholder="45"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Créatinine (mg/dL)</Label>
              <Input 
                type="number" 
                step="0.1"
                placeholder="1.0"
                value={creatinine}
                onChange={(e) => setCreatinine(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sexe</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Homme</SelectItem>
                  <SelectItem value="female">Femme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Poids (kg) - pour Cockcroft</Label>
              <Input 
                type="number" 
                placeholder="70"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>
        );

      case "glasgow":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Réponse oculaire (E)</Label>
              <Select value={eyeResponse} onValueChange={setEyeResponse}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 - Spontanée</SelectItem>
                  <SelectItem value="3">3 - À la demande verbale</SelectItem>
                  <SelectItem value="2">2 - À la douleur</SelectItem>
                  <SelectItem value="1">1 - Aucune</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Réponse verbale (V)</Label>
              <Select value={verbalResponse} onValueChange={setVerbalResponse}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 - Orientée</SelectItem>
                  <SelectItem value="4">4 - Confuse</SelectItem>
                  <SelectItem value="3">3 - Mots inappropriés</SelectItem>
                  <SelectItem value="2">2 - Sons incompréhensibles</SelectItem>
                  <SelectItem value="1">1 - Aucune</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Réponse motrice (M)</Label>
              <Select value={motorResponse} onValueChange={setMotorResponse}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 - Obéit aux ordres</SelectItem>
                  <SelectItem value="5">5 - Localise la douleur</SelectItem>
                  <SelectItem value="4">4 - Évitement</SelectItem>
                  <SelectItem value="3">3 - Flexion anormale</SelectItem>
                  <SelectItem value="2">2 - Extension</SelectItem>
                  <SelectItem value="1">1 - Aucune</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return <p className="text-muted-foreground">Sélectionnez un calculateur</p>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Calculateurs Médicaux
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedCalculator} onValueChange={setSelectedCalculator}>
          <TabsList className="grid grid-cols-3 lg:grid-cols-5 mb-4">
            {calculators.map((calc) => (
              <TabsTrigger key={calc.id} value={calc.id} className="text-xs">
                <calc.icon className="h-3 w-3 mr-1" />
                {calc.name.split(" ")[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          {calculators.map((calc) => (
            <TabsContent key={calc.id} value={calc.id}>
              <div className="space-y-4">
                <h3 className="font-medium">{calc.name}</h3>
                {renderInputs()}
                
                <Button 
                  onClick={handleCalculate} 
                  disabled={isCalculating}
                  className="w-full"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  {isCalculating ? "Calcul..." : "Calculer"}
                </Button>

                {result && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-4">
                      <div className="text-center space-y-2">
                        <div className="text-3xl font-bold text-primary">
                          {result.value} {result.unit}
                        </div>
                        <p className="font-medium">{result.interpretation}</p>
                        <p className="text-sm text-muted-foreground">
                          Valeurs normales: {result.normalRange}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
