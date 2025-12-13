import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Brain, 
  TrendingUp, 
  BookOpen, 
  Sparkles,
  Loader2,
  ExternalLink,
  Database,
  Globe,
  Lightbulb,
  FileText,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SearchResult {
  type: 'semantic' | 'hypothesis' | 'trends' | 'literature';
  query: string;
  result: string;
  timestamp: Date;
}

export default function Research() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hypothesisData, setHypothesisData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentResult, setCurrentResult] = useState<string | null>(null);

  const executeResearchAction = async (action: string, query: string, context?: string) => {
    if (!query.trim()) {
      toast.error("Veuillez entrer une requête de recherche");
      return;
    }

    setIsLoading(true);
    setActiveAction(action);
    setCurrentResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('research-ai', {
        body: { action, query, context }
      });

      if (error) throw error;

      if (data.success) {
        setCurrentResult(data.result);
        setResults(prev => [{
          type: action as any,
          query,
          result: data.result,
          timestamp: new Date()
        }, ...prev.slice(0, 9)]);
        toast.success("Recherche terminée");
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Research error:', error);
      toast.error(error.message || "Erreur lors de la recherche");
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const externalResources = [
    { name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/", icon: FileText, description: "Base de données médicale" },
    { name: "WHO", url: "https://www.who.int/", icon: Globe, description: "Organisation Mondiale de la Santé" },
    { name: "ClinicalTrials", url: "https://clinicaltrials.gov/", icon: Database, description: "Essais cliniques" },
    { name: "Cochrane", url: "https://www.cochrane.org/", icon: BookOpen, description: "Revues systématiques" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            Research Core
          </h1>
          <p className="text-muted-foreground">
            Moteur de recherche sémantique et génération d'hypothèses par IA pour la recherche médicale
          </p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Recherche</span>
            </TabsTrigger>
            <TabsTrigger value="hypothesis" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Hypothèses</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Tendances</span>
            </TabsTrigger>
            <TabsTrigger value="literature" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Littérature</span>
            </TabsTrigger>
          </TabsList>

          {/* Semantic Search Tab */}
          <TabsContent value="search" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Recherche Sémantique
                    </CardTitle>
                    <CardDescription>
                      Recherchez dans vos données internes et obtenez des recommandations de sources externes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ex: diabète type 2 traitement insuline, hypertension artérielle..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && executeResearchAction('semantic_search', searchQuery)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => executeResearchAction('semantic_search', searchQuery)}
                        disabled={isLoading && activeAction === 'semantic_search'}
                      >
                        {isLoading && activeAction === 'semantic_search' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Suggestions:</span>
                      {["cardiologie", "diabète", "hypertension", "cancer", "neurologie"].map((term) => (
                        <Badge 
                          key={term} 
                          variant="outline" 
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => setSearchQuery(term)}
                        >
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Results Display */}
                {currentResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Résultats de la recherche
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                          {currentResult}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* External Resources Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sources Externes</CardTitle>
                    <CardDescription>Bases de données médicales recommandées</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {externalResources.map((resource) => (
                      <a
                        key={resource.name}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <resource.icon className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{resource.name}</div>
                          <div className="text-xs text-muted-foreground">{resource.description}</div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ))}
                  </CardContent>
                </Card>

                {/* Recent Searches */}
                {results.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recherches Récentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {results.slice(0, 5).map((r, idx) => (
                            <div 
                              key={idx}
                              className="p-2 rounded border text-sm cursor-pointer hover:bg-accent"
                              onClick={() => setCurrentResult(r.result)}
                            >
                              <div className="font-medium truncate">{r.query}</div>
                              <div className="text-xs text-muted-foreground">
                                {r.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Hypothesis Generation Tab */}
          <TabsContent value="hypothesis" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Génération d'Hypothèses
                  </CardTitle>
                  <CardDescription>
                    Entrez des données cliniques ou des observations pour générer des hypothèses de recherche
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Décrivez vos observations cliniques, données de patients, ou patterns identifiés...

Exemple: 
- 15 patients diabétiques de type 2 présentent une amélioration du contrôle glycémique après 3 mois d'exercice aérobique
- Corrélation observée entre stress et pics glycémiques
- Moyenne d'âge: 55 ans, IMC moyen: 28"
                    value={hypothesisData}
                    onChange={(e) => setHypothesisData(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <Button 
                    onClick={() => executeResearchAction('generate_hypothesis', hypothesisData)}
                    disabled={isLoading && activeAction === 'generate_hypothesis'}
                    className="w-full"
                  >
                    {isLoading && activeAction === 'generate_hypothesis' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Brain className="h-4 w-4 mr-2" />
                    )}
                    Générer des Hypothèses
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Hypothèses Générées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentResult && activeAction === null ? (
                    <ScrollArea className="h-[350px]">
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {currentResult}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Les hypothèses générées apparaîtront ici</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Analysis Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Analyse des Tendances
                </CardTitle>
                <CardDescription>
                  Analysez les tendances et patterns dans vos données cliniques
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Collez vos données ou décrivez les patterns à analyser..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-[150px]"
                />
                <Button 
                  onClick={() => executeResearchAction('analyze_trends', searchQuery)}
                  disabled={isLoading && activeAction === 'analyze_trends'}
                >
                  {isLoading && activeAction === 'analyze_trends' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <TrendingUp className="h-4 w-4 mr-2" />
                  )}
                  Analyser les Tendances
                </Button>

                {currentResult && (
                  <>
                    <Separator />
                    <ScrollArea className="h-[300px]">
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {currentResult}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Literature Review Tab */}
          <TabsContent value="literature" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Revue de Littérature
                    </CardTitle>
                    <CardDescription>
                      Obtenez une synthèse de l'état de l'art sur un sujet médical
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Sujet de recherche: ex. 'immunothérapie cancer poumon', 'CRISPR maladies génétiques'..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && executeResearchAction('literature_review', searchQuery)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => executeResearchAction('literature_review', searchQuery)}
                        disabled={isLoading && activeAction === 'literature_review'}
                      >
                        {isLoading && activeAction === 'literature_review' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {currentResult && (
                      <ScrollArea className="h-[400px] border rounded-lg p-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                          {currentResult}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sujets Populaires</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      "Intelligence artificielle en diagnostic",
                      "Thérapies géniques CRISPR",
                      "Microbiome et santé mentale",
                      "Long COVID syndromes",
                      "Médecine personnalisée oncologie"
                    ].map((topic) => (
                      <Button
                        key={topic}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => {
                          setSearchQuery(topic);
                          executeResearchAction('literature_review', topic);
                        }}
                      >
                        {topic}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
