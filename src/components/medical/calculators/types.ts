export interface CalculatorResult {
  value: number | string;
  unit: string;
  interpretation: string;
  normalRange: string;
  severity?: 'low' | 'normal' | 'high' | 'critical';
}

export interface CalculatorDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: CalculatorField[];
  calculate: (inputs: Record<string, any>) => CalculatorResult;
}

export interface CalculatorField {
  id: string;
  label: string;
  type: 'number' | 'select' | 'checkbox';
  placeholder?: string;
  step?: string;
  options?: { value: string; label: string }[];
  unit?: string;
  min?: number;
  max?: number;
}

export interface CalculatorCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  calculators: CalculatorDefinition[];
}

export interface SavedCalculation {
  id: string;
  patientId: string;
  calculatorId: string;
  calculatorName: string;
  inputData: Record<string, any>;
  result: CalculatorResult;
  calculatedAt: string;
  doctorId: string;
}
