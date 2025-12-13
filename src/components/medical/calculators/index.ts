import { CalculatorCategory, CalculatorDefinition } from './types';
import { reanimationCalculators } from './reanimation';
import { cardiologyCalculators } from './cardiology';
import { nephrologyCalculators } from './nephrology';
import { hepatologyCalculators } from './hepatology';
import { pulmonologyCalculators } from './pulmonology';
import { geriatricsCalculators } from './geriatrics';
import { psychiatryCalculators } from './psychiatry';
import { oncologyCalculators } from './oncology';
import { generalCalculators } from './general';
import { dermatologyCalculators } from './dermatology';

export const calculatorCategories: CalculatorCategory[] = [
  {
    id: 'reanimation',
    name: 'Réanimation / Urgences',
    icon: 'AlertTriangle',
    color: 'destructive',
    calculators: reanimationCalculators
  },
  {
    id: 'cardiology',
    name: 'Cardiologie',
    icon: 'Heart',
    color: 'red',
    calculators: cardiologyCalculators
  },
  {
    id: 'nephrology',
    name: 'Néphrologie',
    icon: 'Droplets',
    color: 'blue',
    calculators: nephrologyCalculators
  },
  {
    id: 'hepatology',
    name: 'Hépatologie / Gastro',
    icon: 'Pill',
    color: 'yellow',
    calculators: hepatologyCalculators
  },
  {
    id: 'pulmonology',
    name: 'Pneumologie',
    icon: 'Wind',
    color: 'cyan',
    calculators: pulmonologyCalculators
  },
  {
    id: 'geriatrics',
    name: 'Gériatrie / Neurologie',
    icon: 'Brain',
    color: 'purple',
    calculators: geriatricsCalculators
  },
  {
    id: 'psychiatry',
    name: 'Psychiatrie',
    icon: 'Smile',
    color: 'pink',
    calculators: psychiatryCalculators
  },
  {
    id: 'oncology',
    name: 'Oncologie / Anatomopathologie',
    icon: 'Microscope',
    color: 'orange',
    calculators: oncologyCalculators
  },
  {
    id: 'dermatology',
    name: 'Dermatologie',
    icon: 'Scan',
    color: 'teal',
    calculators: dermatologyCalculators
  },
  {
    id: 'general',
    name: 'Général / Endocrinologie',
    icon: 'Scale',
    color: 'green',
    calculators: generalCalculators
  }
];

export const allCalculators: CalculatorDefinition[] = calculatorCategories.flatMap(cat => cat.calculators);

export function getCalculatorById(id: string): CalculatorDefinition | undefined {
  return allCalculators.find(calc => calc.id === id);
}

export function getCalculatorsByCategory(categoryId: string): CalculatorDefinition[] {
  const category = calculatorCategories.find(cat => cat.id === categoryId);
  return category?.calculators || [];
}

export * from './types';
