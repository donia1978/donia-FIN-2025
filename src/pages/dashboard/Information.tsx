import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Newspaper, 
  Palette, 
  Trophy, 
  RefreshCw, 
  ExternalLink, 
  Calendar,
  MapPin,
  Clock,
  Loader2,
  Globe
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Category = 'politics' | 'culture' | 'sports';

interface NewsArticle {
  id: string;
  category: string;
  title: string;
  summary: string | null;
  content: string | null;
  source_url: string | null;
  source_name: string | null;
  image_url: string | null;
  video_url: string | null;
  published_at: string | null;
  country: string;
  created_at: string;
}

const countries = [
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸' },
  { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧' },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪' },
  { code: 'ES', name: 'Espagne', flag: '🇪🇸' },
  { code: 'IT', name: 'Italie', flag: '🇮🇹' },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭' },
];

// Hook to detect user's country from IP
function useUserCountry() {
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Using ip-api.com (free, no API key required)
        const response = await fetch('http://ip-api.com/json/?fields=countryCode');
        const data = await response.json();
        
        if (data.countryCode) {
          // Check if detected country is in our supported list
          const isSupported = countries.some(c => c.code === data.countryCode);
          setDetectedCountry(isSupported ? data.countryCode : 'FR');
        }
      } catch (error) {
        console.log('Could not detect country, defaulting to FR');
        setDetectedCountry('FR');
      } finally {
        setIsDetecting(false);
      }
    };

    detectCountry();
  }, []);

  return { detectedCountry, isDetecting };
}

const categoryConfig = {
  politics: {
    label: 'Politique',
    icon: Newspaper,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  culture: {
    label: 'Culture',
    icon: Palette,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  sports: {
    label: 'Sports',
    icon: Trophy,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
};

function NewsCard({ article }: { article: NewsArticle }) {
  const publishedDate = article.published_at 
    ? format(new Date(article.published_at), 'PPP', { locale: fr })
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
      {article.image_url && (
        <div className="relative h-48 overflow-hidden">
          <img 
            src={article.image_url} 
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = `https://picsum.photos/seed/${article.id}/800/400`;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {article.source_name && (
            <Badge className="absolute top-3 left-3 bg-primary/90">
              {article.source_name}
            </Badge>
          )}
        </div>
      )}
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {article.summary}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {publishedDate && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {publishedDate}
            </div>
          )}
          {article.source_url && (
            <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
              <a href={article.source_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Lire
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NewsSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

function CategoryContent({ category, country }: { category: Category; country: string }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: articles, isLoading, error } = useQuery({
    queryKey: ['news', category, country],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-news', {
        body: { category, country, action: 'get' }
      });
      if (error) throw error;
      return data?.data as NewsArticle[] || [];
    },
  });

  const handleRefresh = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-news', {
        body: { category, country, action: 'generate' }
      });
      
      if (error) throw error;
      
      toast.success(`${data?.generated || 0} nouveaux articles générés`);
      queryClient.invalidateQueries({ queryKey: ['news', category, country] });
    } catch (err) {
      console.error('Error generating news:', err);
      toast.error("Erreur lors de la génération des actualités");
    } finally {
      setIsGenerating(false);
    }
  };

  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{config.label}</h2>
            <p className="text-sm text-muted-foreground">
              {articles?.length || 0} articles
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? 'Génération...' : 'Actualiser'}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-center text-destructive">
            Erreur lors du chargement des actualités
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <NewsSkeleton key={i} />
          ))}
        </div>
      ) : articles && articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Icon className={`h-12 w-12 mx-auto mb-4 ${config.color} opacity-50`} />
            <h3 className="font-medium mb-2">Aucun article disponible</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cliquez sur Actualiser pour générer des articles d'actualité
            </p>
            <Button onClick={handleRefresh} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Générer des articles
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Information() {
  const { detectedCountry, isDetecting } = useUserCountry();
  const [activeTab, setActiveTab] = useState<Category>('politics');
  const [country, setCountry] = useState<string>('');
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  // Set country once detected
  useEffect(() => {
    if (detectedCountry && !hasAutoDetected) {
      setCountry(detectedCountry);
      setHasAutoDetected(true);
      const countryInfo = countries.find(c => c.code === detectedCountry);
      if (countryInfo) {
        toast.success(`Pays détecté: ${countryInfo.flag} ${countryInfo.name}`);
      }
    }
  }, [detectedCountry, hasAutoDetected]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Actualités & Information</h1>
            <p className="text-muted-foreground">
              Restez informé des dernières actualités politiques, culturelles et sportives
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDetecting ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Détection du pays...</span>
              </div>
            ) : (
              <>
                {hasAutoDetected && (
                  <Badge variant="outline" className="gap-1">
                    <Globe className="h-3 w-3" />
                    Auto
                  </Badge>
                )}
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sélectionner un pays" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span>{c.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Category)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="politics" className="gap-2">
              <Newspaper className="h-4 w-4" />
              <span className="hidden sm:inline">Politique</span>
            </TabsTrigger>
            <TabsTrigger value="culture" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Culture</span>
            </TabsTrigger>
            <TabsTrigger value="sports" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Sports</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="politics" className="m-0">
              <CategoryContent category="politics" country={country} />
            </TabsContent>
            <TabsContent value="culture" className="m-0">
              <CategoryContent category="culture" country={country} />
            </TabsContent>
            <TabsContent value="sports" className="m-0">
              <CategoryContent category="sports" country={country} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
