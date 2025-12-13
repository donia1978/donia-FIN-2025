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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ArrowRight,
  BookMarked,
  Calendar,
  Users,
  GitBranch,
  Microscope,
  Activity,
  Stethoscope,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SearchResult {
  type: 'semantic' | 'hypothesis' | 'trends' | 'literature';
  query: string;
  result: string;
  timestamp: Date;
}

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  pubDate: string;
  doi: string | null;
  url: string;
  volume?: string;
  issue?: string;
  pages?: string;
}

export default function Research() {
  const [searchQuery, setSearchQuery] = useState("");
  const [pubmedQuery, setPubmedQuery] = useState("");
  const [hypothesisData, setHypothesisData] = useState("");
  const [hypothesisContext, setHypothesisContext] = useState("");
  const [researchType, setResearchType] = useState("clinical");
  const [confidenceLevel, setConfidenceLevel] = useState("medium");
  const [trendContext, setTrendContext] = useState("");
  const [literatureContext, setLiteratureContext] = useState("");
  const [reviewType, setReviewType] = useState("narrative");
  const [correlationData, setCorrelationData] = useState("");
  const [clinicalData, setClinicalData] = useState("");
  const [clinicalContext, setClinicalContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPubmedLoading, setIsPubmedLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentResult, setCurrentResult] = useState<string | null>(null);
  const [pubmedArticles, setPubmedArticles] = useState<PubMedArticle[]>([]);
  const [pubmedTotalFound, setPubmedTotalFound] = useState(0);

  const executeResearchAction = async (
    action: string, 
    query: string, 
    context?: string,
    options?: Record<string, any>
  ) => {
    if (!query.trim()) {
      toast.error("Veuillez entrer une requête de recherche");
      return;
    }

    setIsLoading(true);
    setActiveAction(action);
    setCurrentResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('research-ai', {
        body: { action, query, context, options }
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
        toast.success("Analyse terminée");
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

  const searchPubMed = async () => {
    if (!pubmedQuery.trim()) {
      toast.error("Veuillez entrer un terme de recherche PubMed");
      return;
    }

    setIsPubmedLoading(true);
    setPubmedArticles([]);

    try {
      const { data, error } = await supabase.functions.invoke('pubmed-search', {
        body: { query: pubmedQuery, maxResults: 15 }
      });

      if (error) throw error;

      if (data.success) {
        setPubmedArticles(data.articles);
        setPubmedTotalFound(data.totalFound);
        toast.success(`${data.articles.length} articles trouvés sur ${data.totalFound} résultats`);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('PubMed search error:', error);
      toast.error(error.message || "Erreur lors de la recherche PubMed");
    } finally {
      setIsPubmedLoading(false);
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
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Recherche</span>
            </TabsTrigger>
            <TabsTrigger value="pubmed" className="gap-2">
              <BookMarked className="h-4 w-4" />
              <span className="hidden sm:inline">PubMed</span>
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
            <TabsTrigger value="correlation" className="gap-2">
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline">Corrélations</span>
            </TabsTrigger>
            <TabsTrigger value="synthesis" className="gap-2">
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">Synthèse</span>
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

          {/* PubMed Search Tab */}
          <TabsContent value="pubmed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookMarked className="h-5 w-5" />
                  Recherche PubMed
                </CardTitle>
                <CardDescription>
                  Recherchez dans la base de données PubMed/MEDLINE en temps réel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: COVID-19 treatment, diabetes mellitus type 2, CRISPR gene therapy..."
                    value={pubmedQuery}
                    onChange={(e) => setPubmedQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchPubMed()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={searchPubMed}
                    disabled={isPubmedLoading}
                  >
                    {isPubmedLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Suggestions:</span>
                  {["immunotherapy", "machine learning diagnosis", "SARS-CoV-2", "Alzheimer treatment", "gene therapy"].map((term) => (
                    <Badge 
                      key={term} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => setPubmedQuery(term)}
                    >
                      {term}
                    </Badge>
                  ))}
                </div>

                {pubmedTotalFound > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {pubmedArticles.length} articles affichés sur {pubmedTotalFound.toLocaleString()} résultats
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PubMed Results */}
            {pubmedArticles.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pubmedArticles.map((article) => (
                  <Card key={article.pmid} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium leading-tight line-clamp-3">
                        {article.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <Users className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{article.authors}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{article.journal}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>{article.pubDate}</span>
                          {article.volume && (
                            <span className="text-muted-foreground/60">
                              Vol. {article.volume}{article.issue && `(${article.issue})`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">
                          PMID: {article.pmid}
                        </Badge>
                        {article.doi && (
                          <Badge variant="outline" className="text-xs">
                            DOI
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          asChild
                        >
                          <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            Voir sur PubMed
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {isPubmedLoading && (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Recherche dans PubMed...</p>
                </div>
              </div>
            )}

            {!isPubmedLoading && pubmedArticles.length === 0 && pubmedQuery && (
              <div className="text-center py-12 text-muted-foreground">
                <BookMarked className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Aucun article trouvé. Essayez un autre terme de recherche.</p>
              </div>
            )}
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

          {/* Cross Correlation Tab */}
          <TabsContent value="correlation" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Analyse de Corrélations Croisées
                  </CardTitle>
                  <CardDescription>
                    Découvrez les relations cachées entre variables et données médicales
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Décrivez les variables et données à analyser pour découvrir des corrélations...

Exemple:
- Variable A: Taux de glucose (moyenne 120 mg/dL)
- Variable B: HbA1c (moyenne 7.2%)
- Variable C: Pression artérielle systolique
- Population: 150 patients diabétiques
- Période: 12 mois de suivi"
                    value={correlationData}
                    onChange={(e) => setCorrelationData(e.target.value)}
                    className="min-h-[200px]"
                  />
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Modèles:</span>
                    {["Clinique-Biologique", "Démographique-Pathologie", "Traitement-Outcome", "Lifestyle-Santé"].map((model) => (
                      <Badge 
                        key={model} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => setCorrelationData(prev => prev + `\nModèle: ${model}`)}
                      >
                        {model}
                      </Badge>
                    ))}
                  </div>

                  <Button 
                    onClick={() => executeResearchAction('cross_correlation', correlationData)}
                    disabled={isLoading && activeAction === 'cross_correlation'}
                    className="w-full"
                  >
                    {isLoading && activeAction === 'cross_correlation' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Analyser les Corrélations
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Résultats d'Analyse
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentResult && activeAction === null ? (
                    <ScrollArea className="h-[400px]">
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {currentResult}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Les corrélations découvertes apparaîtront ici</p>
                        <p className="text-xs mt-2">Matrice de corrélation • Relations significatives • Insights</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Clinical Synthesis Tab */}
          <TabsContent value="synthesis" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="h-5 w-5" />
                      Synthèse Clinique IA
                    </CardTitle>
                    <CardDescription>
                      Intégrez données patient, littérature et guidelines pour une synthèse evidence-based
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Données cliniques du patient:
- Âge, sexe, antécédents
- Symptômes actuels
- Résultats biologiques
- Imagerie
- Traitements en cours..."
                        value={clinicalData}
                        onChange={(e) => setClinicalData(e.target.value)}
                        className="min-h-[150px]"
                      />
                      
                      <Input
                        placeholder="Contexte/Question clinique spécifique (optionnel)..."
                        value={clinicalContext}
                        onChange={(e) => setClinicalContext(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Templates:</span>
                      {[
                        "Diagnostic différentiel",
                        "Stratégie thérapeutique", 
                        "Pronostic & suivi",
                        "Interactions médicamenteuses"
                      ].map((template) => (
                        <Badge 
                          key={template} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => setClinicalContext(template)}
                        >
                          {template}
                        </Badge>
                      ))}
                    </div>

                    <Button 
                      onClick={() => executeResearchAction('clinical_synthesis', clinicalData, clinicalContext)}
                      disabled={isLoading && activeAction === 'clinical_synthesis'}
                      className="w-full"
                    >
                      {isLoading && activeAction === 'clinical_synthesis' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Microscope className="h-4 w-4 mr-2" />
                      )}
                      Générer Synthèse Clinique
                    </Button>
                  </CardContent>
                </Card>

                {currentResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Synthèse Evidence-Based
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

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Capacités IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { icon: Stethoscope, title: "Évaluation clinique", desc: "Diagnostic et différentiels" },
                      { icon: BookOpen, title: "Evidence-based", desc: "Intégration littérature" },
                      { icon: Activity, title: "Guidelines", desc: "Recommandations actuelles" },
                      { icon: Lightbulb, title: "Personnalisé", desc: "Adapté au profil patient" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                        <item.icon className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">{item.title}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                      <Sparkles className="h-8 w-8 mx-auto text-primary" />
                      <h4 className="font-semibold">Recherche Avancée</h4>
                      <p className="text-xs text-muted-foreground">
                        Powered by Gemini 2.5 Flash avec accès aux données internes et littérature médicale
                      </p>
                    </div>
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
