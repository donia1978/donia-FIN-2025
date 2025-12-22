import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Download,
  Edit,
  Save,
  BookOpen,
  Globe,
  School,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  generateExamDocx, 
  generateTunisianExercises, 
  ExamData,
  ExerciseData,
  QuestionData,
  SourceReference,
  TUNISIAN_RESOURCES 
} from "@/lib/examDocxGenerator";
import { Badge } from "@/components/ui/badge";

const SUBJECTS = [
  "Mathématiques",
  "Physique",
  "Chimie",
  "Biologie",
  "Français",
  "Anglais",
  "Arabe",
  "Histoire",
  "Géographie",
  "Philosophie",
  "Informatique",
  "Sciences",
  "Éducation civique",
  "Éducation islamique",
];

const LEVELS = [
  { group: "Primaire", items: ["1ère année", "2ème année", "3ème année", "4ème année", "5ème année", "6ème année"] },
  { group: "Collège", items: ["7ème année", "8ème année", "9ème année"] },
  { group: "Lycée", items: ["1ère année secondaire", "2ème année secondaire", "3ème année secondaire", "Baccalauréat"] },
];

const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية (Arabe)" },
  { value: "en", label: "English" },
];

const EVALUATION_TYPES = [
  { value: "controle1", label: "Devoir de Contrôle N°1" },
  { value: "controle2", label: "Devoir de Contrôle N°2" },
  { value: "controle3", label: "Devoir de Contrôle N°3" },
  { value: "synthese1", label: "Devoir de Synthèse N°1" },
  { value: "synthese2", label: "Devoir de Synthèse N°2" },
  { value: "synthese3", label: "Devoir de Synthèse N°3" },
  { value: "formative", label: "Évaluation Formative" },
  { value: "diagnostic", label: "Évaluation Diagnostique" },
];

const TRIMESTERS = [
  { value: "1", label: "1er Trimestre" },
  { value: "2", label: "2ème Trimestre" },
  { value: "3", label: "3ème Trimestre" },
];

const TUNISIAN_SOURCES = [
  { id: "devoir.tn", name: "Devoir.tn", url: "https://www.devoir.tn", icon: "📚" },
  { id: "edunet.tn", name: "EduNet.tn", url: "https://www.edunet.tn", icon: "🎓" },
  { id: "cnp.tn", name: "CNP Tunisie", url: "https://www.cnp.com.tn", icon: "📖" },
];

interface FormData {
  schoolName: string;
  subject: string;
  level: string;
  language: "fr" | "ar" | "en";
  evaluationType: string;
  trimester: string;
  schoolYear: string;
  duration: number;
  exerciseCount: number;
  easyPercent: number;
  mediumPercent: number;
  hardPercent: number;
  includeAnswerKey: boolean;
  objectives: string;
  selectedSources: string[];
}

export default function ExamGenerator() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExam, setGeneratedExam] = useState<ExamData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    schoolName: "المدرسة الابتدائية",
    subject: "",
    level: "",
    language: "ar",
    evaluationType: "controle1",
    trimester: "1",
    schoolYear: "2024-2025",
    duration: 60,
    exerciseCount: 4,
    easyPercent: 30,
    mediumPercent: 50,
    hardPercent: 20,
    includeAnswerKey: true,
    objectives: "",
    selectedSources: ["devoir.tn"],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const totalSteps = 2;
  const progress = (currentStep / totalSteps) * 100;

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (step === 1) {
      if (!formData.subject) newErrors.subject = "Veuillez sélectionner une matière";
      if (!formData.level) newErrors.level = "Veuillez sélectionner un niveau";
      if (!formData.language) newErrors.language = "Veuillez sélectionner une langue";
      if (!formData.schoolName) newErrors.schoolName = "Veuillez entrer le nom de l'école";
    }

    if (step === 2) {
      if (formData.duration < 15 || formData.duration > 240) {
        newErrors.duration = "La durée doit être entre 15 et 240 minutes";
      }
      if (formData.exerciseCount < 1 || formData.exerciseCount > 20) {
        newErrors.exerciseCount = "Le nombre d'exercices doit être entre 1 et 20";
      }
      const totalPercent = formData.easyPercent + formData.mediumPercent + formData.hardPercent;
      if (totalPercent !== 100) {
        newErrors.easyPercent = `Le total des pourcentages doit être 100% (actuellement ${totalPercent}%)`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleGenerate = async () => {
    if (!validateStep(currentStep)) return;

    setIsGenerating(true);
    
    // Simulate fetching from Tunisian educational resources
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Generate exercises based on Tunisian curriculum
    const { exercises, sources } = generateTunisianExercises(
      formData.subject,
      formData.level,
      formData.language,
      formData.exerciseCount,
      {
        easy: formData.easyPercent,
        medium: formData.mediumPercent,
        hard: formData.hardPercent,
      }
    );

    const evaluationLabel = EVALUATION_TYPES.find(t => t.value === formData.evaluationType)?.label || formData.evaluationType;
    
    const examData: ExamData = {
      schoolName: formData.schoolName,
      subject: formData.subject,
      level: formData.level,
      trimester: `${TRIMESTERS.find(t => t.value === formData.trimester)?.label || formData.trimester}`,
      schoolYear: formData.schoolYear,
      duration: `${formData.duration} min`,
      exercises,
      includeAnswerKey: formData.includeAnswerKey,
      language: formData.language,
      evaluationType: formData.evaluationType,
      sourceReferences: sources,
    };

    setGeneratedExam(examData);
    setIsGenerating(false);
    
    toast({
      title: "Examen généré",
      description: `Examen basé sur ${sources.length} ressources tunisiennes`,
    });
  };

  const handleDownloadDocx = async () => {
    if (!generatedExam) return;
    
    try {
      await generateExamDocx(generatedExam);
      toast({
        title: "Téléchargement réussi",
        description: "Le fichier DOCX a été téléchargé.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le fichier DOCX.",
        variant: "destructive",
      });
    }
  };

  const handleSaveDraft = () => {
    toast({
      title: "Brouillon enregistré",
      description: "Votre examen a été sauvegardé comme brouillon.",
    });
  };

  const adjustDifficulty = (field: "easyPercent" | "mediumPercent" | "hardPercent", value: number) => {
    const remaining = 100 - value;
    const others = ["easyPercent", "mediumPercent", "hardPercent"].filter((f) => f !== field) as Array<"easyPercent" | "mediumPercent" | "hardPercent">;
    const currentOtherTotal = formData[others[0]] + formData[others[1]];
    
    if (currentOtherTotal === 0) {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        [others[0]]: Math.floor(remaining / 2),
        [others[1]]: Math.ceil(remaining / 2),
      }));
    } else {
      const ratio0 = formData[others[0]] / currentOtherTotal;
      const ratio1 = formData[others[1]] / currentOtherTotal;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        [others[0]]: Math.round(remaining * ratio0),
        [others[1]]: Math.round(remaining * ratio1),
      }));
    }
  };

  const toggleSource = (sourceId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSources: prev.selectedSources.includes(sourceId)
        ? prev.selectedSources.filter(s => s !== sourceId)
        : [...prev.selectedSources, sourceId],
    }));
  };

  if (isGenerating) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <BookOpen className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Génération en cours...</h2>
            <p className="text-muted-foreground">
              Récupération des exercices depuis les ressources tunisiennes...
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {formData.selectedSources.map(sourceId => {
                const source = TUNISIAN_SOURCES.find(s => s.id === sourceId);
                return source ? (
                  <Badge key={sourceId} variant="secondary" className="text-sm">
                    {source.icon} {source.name}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
          <div className="w-64">
            <Progress value={66} className="h-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (generatedExam) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Examen Généré</h1>
              <p className="text-muted-foreground">
                {generatedExam.subject} - {generatedExam.level}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setGeneratedExam(null)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button onClick={handleDownloadDocx} className="bg-primary">
                <Download className="h-4 w-4 mr-2" />
                Télécharger DOCX
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Aperçu de l'examen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Header Preview */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">{generatedExam.schoolName}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">{formData.evaluationType.includes("synthese") ? "Devoir de Synthèse" : "Devoir de Contrôle"}</p>
                    <p className="font-medium">{generatedExam.subject}</p>
                  </div>
                  <div className="text-right">
                    <p>Année: {generatedExam.schoolYear}</p>
                    <p>Classe: {generatedExam.level}</p>
                    <p>Durée: {generatedExam.duration}</p>
                  </div>
                </div>
              </div>

              {/* Exercises Preview */}
              <div className="space-y-4">
                {generatedExam.exercises.map((exercise, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">
                        {formData.language === "ar" ? `التمرين ${index + 1}` : `Exercice ${index + 1}`}
                      </h3>
                      <div className="flex gap-2">
                        <Badge variant={
                          exercise.difficulty === "easy" ? "default" :
                          exercise.difficulty === "medium" ? "secondary" : "destructive"
                        }>
                          {exercise.difficulty === "easy" ? "Facile" :
                           exercise.difficulty === "medium" ? "Moyen" : "Difficile"}
                        </Badge>
                        <Badge variant="outline">{exercise.points} pts</Badge>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {exercise.questions.map((q: QuestionData, qIndex: number) => (
                        <div key={qIndex} className="space-y-1">
                          <p className="text-foreground">
                            {qIndex + 1}. {q.text}
                            {q.points && <span className="text-muted-foreground ml-2">({q.points} pt{q.points > 1 ? 's' : ''})</span>}
                          </p>
                          {q.subQuestions && q.subQuestions.length > 0 && (
                            <div className="ml-4 text-muted-foreground">
                              {q.subQuestions.map((sub: string, subIdx: number) => (
                                <p key={subIdx}>{String.fromCharCode(97 + subIdx)}) {sub}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {exercise.source && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Source: {exercise.source.name} - <a href={exercise.source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{exercise.source.url}</a>
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Source References */}
              {generatedExam.sourceReferences && generatedExam.sourceReferences.length > 0 && (
                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                  <h3 className="font-semibold mb-3 text-blue-700 dark:text-blue-400">
                    Sources Pédagogiques Tunisiennes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {generatedExam.sourceReferences.map((source: SourceReference, idx: number) => (
                      <a 
                        key={idx}
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm bg-background border rounded-md px-2 py-1 hover:bg-accent transition-colors"
                      >
                        <Globe className="h-3 w-3" />
                        {source.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Grading Table Preview */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">
                  {formData.language === "ar" ? "سلم التنقيط" : "Barème de notation"}
                </h3>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="font-medium">Exercice</div>
                  <div className="font-medium">Points</div>
                  <div className="font-medium">Difficulté</div>
                  <div className="font-medium">Note</div>
                  {generatedExam.exercises.map((ex, i) => (
                    <>
                      <div key={`ex-${i}`}>{i + 1}</div>
                      <div key={`pts-${i}`}>{ex.points}</div>
                      <div key={`diff-${i}`}>{ex.difficulty}</div>
                      <div key={`note-${i}`}>___/{ ex.points}</div>
                    </>
                  ))}
                  <div className="font-bold border-t pt-2">Total</div>
                  <div className="font-bold border-t pt-2">
                    {generatedExam.exercises.reduce((sum, ex) => sum + ex.points, 0)}
                  </div>
                  <div className="border-t pt-2"></div>
                  <div className="font-bold border-t pt-2">/20</div>
                </div>
              </div>

              {generatedExam.includeAnswerKey && (
                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
                  <h3 className="font-semibold mb-3 text-green-700 dark:text-green-400">
                    {formData.language === "ar" ? "الإصلاح" : "Corrigé inclus"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Le corrigé sera inclus dans le document DOCX téléchargé.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard/education")}>
              Retour à l'éducation
            </Button>
            <Button onClick={handleDownloadDocx}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger DOCX
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Générateur d'Examens</h1>
            <p className="text-muted-foreground">
              Créez des examens basés sur les ressources pédagogiques tunisiennes
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/dashboard/education")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Tunisian Resources Banner */}
        <Card className="bg-gradient-to-r from-red-500/10 via-white/5 to-red-500/10 border-red-500/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Globe className="h-8 w-8 text-red-500" />
              <div className="flex-1">
                <h3 className="font-semibold">Ressources Pédagogiques Tunisiennes</h3>
                <p className="text-sm text-muted-foreground">
                  Exercices et examens basés sur le programme officiel tunisien
                </p>
              </div>
              <div className="flex gap-2">
                {TUNISIAN_SOURCES.map(source => (
                  <Badge 
                    key={source.id}
                    variant={formData.selectedSources.includes(source.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSource(source.id)}
                  >
                    {source.icon} {source.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Étape {currentStep} sur {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className={cn(currentStep >= 1 && "text-primary font-medium")}>
              Informations
            </span>
            <span className={cn(currentStep >= 2 && "text-primary font-medium")}>
              Paramètres
            </span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Informations de base"}
              {currentStep === 2 && "Paramètres de l'examen"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">Nom de l'établissement *</Label>
                  <div className="flex gap-2">
                    <School className="h-5 w-5 mt-2 text-muted-foreground" />
                    <Input
                      id="schoolName"
                      placeholder="المدرسة الابتدائية / École Primaire"
                      value={formData.schoolName}
                      onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                      className={errors.schoolName ? "border-destructive" : ""}
                    />
                  </div>
                  {errors.schoolName && (
                    <p className="text-sm text-destructive">{errors.schoolName}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Matière *</Label>
                    <Select
                      value={formData.subject}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, subject: v }))}
                    >
                      <SelectTrigger className={errors.subject ? "border-destructive" : ""}>
                        <SelectValue placeholder="Sélectionner une matière" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.subject && (
                      <p className="text-sm text-destructive">{errors.subject}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level">Niveau *</Label>
                    <Select
                      value={formData.level}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, level: v }))}
                    >
                      <SelectTrigger className={errors.level ? "border-destructive" : ""}>
                        <SelectValue placeholder="Sélectionner un niveau" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((group) => (
                          <div key={group.group}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {group.group}
                            </div>
                            {group.items.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.level && (
                      <p className="text-sm text-destructive">{errors.level}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Langue *</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, language: v as "fr" | "ar" | "en" }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolYear">Année scolaire</Label>
                    <Input
                      id="schoolYear"
                      placeholder="2024-2025"
                      value={formData.schoolYear}
                      onChange={(e) => setFormData(prev => ({ ...prev, schoolYear: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="evaluationType">Type d'évaluation *</Label>
                    <Select
                      value={formData.evaluationType}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, evaluationType: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVALUATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trimester">Trimestre</Label>
                    <Select
                      value={formData.trimester}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, trimester: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIMESTERS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Parameters */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Durée (minutes) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={15}
                      max={240}
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, duration: parseInt(e.target.value) || 60 }))
                      }
                      className={errors.duration ? "border-destructive" : ""}
                    />
                    {errors.duration && (
                      <p className="text-sm text-destructive">{errors.duration}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exerciseCount">Nombre d'exercices *</Label>
                    <Input
                      id="exerciseCount"
                      type="number"
                      min={1}
                      max={20}
                      value={formData.exerciseCount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          exerciseCount: parseInt(e.target.value) || 4,
                        }))
                      }
                      className={errors.exerciseCount ? "border-destructive" : ""}
                    />
                    {errors.exerciseCount && (
                      <p className="text-sm text-destructive">{errors.exerciseCount}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Répartition de la difficulté</Label>
                  {errors.easyPercent && (
                    <p className="text-sm text-destructive">{errors.easyPercent}</p>
                  )}
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-500">Facile</span>
                        <span>{formData.easyPercent}%</span>
                      </div>
                      <Slider
                        value={[formData.easyPercent]}
                        onValueChange={([v]) => adjustDifficulty("easyPercent", v)}
                        max={100}
                        step={5}
                        className="[&_[role=slider]]:bg-green-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-500">Moyen</span>
                        <span>{formData.mediumPercent}%</span>
                      </div>
                      <Slider
                        value={[formData.mediumPercent]}
                        onValueChange={([v]) => adjustDifficulty("mediumPercent", v)}
                        max={100}
                        step={5}
                        className="[&_[role=slider]]:bg-yellow-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-red-500">Difficile</span>
                        <span>{formData.hardPercent}%</span>
                      </div>
                      <Slider
                        value={[formData.hardPercent]}
                        onValueChange={([v]) => adjustDifficulty("hardPercent", v)}
                        max={100}
                        step={5}
                        className="[&_[role=slider]]:bg-red-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAnswerKey"
                    checked={formData.includeAnswerKey}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, includeAnswerKey: !!checked }))
                    }
                  />
                  <Label htmlFor="includeAnswerKey" className="cursor-pointer">
                    Inclure le corrigé (الإصلاح)
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objectives">Objectifs pédagogiques (optionnel)</Label>
                  <Textarea
                    id="objectives"
                    placeholder="Décrivez les compétences et connaissances à évaluer..."
                    value={formData.objectives}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, objectives: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-2" />
              Brouillon
            </Button>

            {currentStep < totalSteps ? (
              <Button onClick={handleNext}>
                Suivant
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleGenerate}>
                <BookOpen className="h-4 w-4 mr-2" />
                Générer & Télécharger DOCX
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
