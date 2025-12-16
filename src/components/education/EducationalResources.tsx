import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileText, Search, Filter, Download, Heart, Plus, BookOpen, ClipboardList, Calendar } from "lucide-react";

const SUBJECTS = [
  { value: "arabic", label: "العربية (Arabe)" },
  { value: "french", label: "Français" },
  { value: "english", label: "Anglais" },
  { value: "math", label: "Mathématiques" },
  { value: "science", label: "Sciences" },
  { value: "physics", label: "Physique" },
  { value: "chemistry", label: "Chimie" },
  { value: "biology", label: "Biologie" },
  { value: "history", label: "Histoire" },
  { value: "geography", label: "Géographie" },
  { value: "civics", label: "Éducation civique" },
  { value: "islamic", label: "Éducation islamique" },
  { value: "tech", label: "Technologie" },
  { value: "informatics", label: "Informatique" },
  { value: "art", label: "Arts plastiques" },
  { value: "music", label: "Éducation musicale" },
  { value: "sport", label: "Éducation physique" },
];

const GRADE_LEVELS = [
  { value: "1ere_primaire", label: "1ère année primaire" },
  { value: "2eme_primaire", label: "2ème année primaire" },
  { value: "3eme_primaire", label: "3ème année primaire" },
  { value: "4eme_primaire", label: "4ème année primaire" },
  { value: "5eme_primaire", label: "5ème année primaire" },
  { value: "6eme_primaire", label: "6ème année primaire" },
  { value: "7eme_base", label: "7ème année de base" },
  { value: "8eme_base", label: "8ème année de base" },
  { value: "9eme_base", label: "9ème année de base" },
  { value: "1ere_secondaire", label: "1ère année secondaire" },
  { value: "2eme_secondaire", label: "2ème année secondaire" },
  { value: "3eme_secondaire", label: "3ème année secondaire" },
  { value: "4eme_secondaire", label: "4ème année (Bac)" },
];

const RESOURCE_TYPES = [
  { value: "exam", label: "Examen / Devoir", icon: ClipboardList },
  { value: "lesson_plan", label: "Fiche de préparation", icon: FileText },
  { value: "unit_plan", label: "Planification par unité", icon: Calendar },
  { value: "exercise", label: "Exercices", icon: BookOpen },
  { value: "other", label: "Autre", icon: FileText },
];

interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  subject: string;
  grade_level: string;
  trimester: string | null;
  content: string | null;
  pdf_url: string | null;
  original_filename: string | null;
  tags: string[];
  author_name: string | null;
  downloads_count: number;
  likes_count: number;
  created_at: string;
}

export function EducationalResources() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [filterGrade, setFilterGrade] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    resource_type: "lesson_plan",
    subject: "",
    grade_level: "",
    trimester: "",
    content: "",
    tags: "",
  });

  useEffect(() => {
    fetchResources();
  }, [filterSubject, filterGrade, filterType]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("educational_resources")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterSubject) {
        query = query.eq("subject", filterSubject);
      }
      if (filterGrade) {
        query = query.eq("grade_level", filterGrade);
      }
      if (filterType) {
        query = query.eq("resource_type", filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("Erreur lors du chargement des ressources");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Vous devez être connecté pour ajouter une ressource");
      return;
    }

    try {
      const { error } = await supabase.from("educational_resources").insert({
        title: formData.title,
        description: formData.description || null,
        resource_type: formData.resource_type,
        subject: formData.subject,
        grade_level: formData.grade_level,
        trimester: formData.trimester || null,
        content: formData.content || null,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : [],
        author_id: user.id,
        author_name: user.user_metadata?.full_name || user.email,
        is_approved: true, // Auto-approve for now
      });

      if (error) throw error;

      toast.success("Ressource ajoutée avec succès!");
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        resource_type: "lesson_plan",
        subject: "",
        grade_level: "",
        trimester: "",
        content: "",
        tags: "",
      });
      fetchResources();
    } catch (error) {
      console.error("Error creating resource:", error);
      toast.error("Erreur lors de la création de la ressource");
    }
  };

  const filteredResources = resources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSubjectLabel = (value: string) => SUBJECTS.find(s => s.value === value)?.label || value;
  const getGradeLabel = (value: string) => GRADE_LEVELS.find(g => g.value === value)?.label || value;
  const getTypeInfo = (value: string) => RESOURCE_TYPES.find(t => t.value === value) || RESOURCE_TYPES[4];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ressources Pédagogiques</h2>
          <p className="text-muted-foreground">
            Examens, fiches de préparation et planifications pour l'enseignement tunisien
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une ressource
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle Ressource Pédagogique</DialogTitle>
              <DialogDescription>
                Partagez vos examens, fiches de préparation ou planifications avec la communauté éducative tunisienne
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Examen Mathématiques 6ème - Trimestre 1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="resource_type">Type de ressource *</Label>
                  <Select
                    value={formData.resource_type}
                    onValueChange={(value) => setFormData({ ...formData, resource_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject">Matière *</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((subject) => (
                        <SelectItem key={subject.value} value={subject.value}>
                          {subject.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="grade_level">Niveau *</Label>
                  <Select
                    value={formData.grade_level}
                    onValueChange={(value) => setFormData({ ...formData, grade_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map((grade) => (
                        <SelectItem key={grade.value} value={grade.value}>
                          {grade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="trimester">Trimestre</Label>
                  <Select
                    value={formData.trimester}
                    onValueChange={(value) => setFormData({ ...formData, trimester: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optionnel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Trimestre 1</SelectItem>
                      <SelectItem value="2">Trimestre 2</SelectItem>
                      <SelectItem value="3">Trimestre 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez brièvement le contenu de cette ressource..."
                    rows={2}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="content">Contenu (texte)</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Collez ici le contenu textuel de votre ressource (questions d'examen, plan de leçon, etc.)"
                    rows={8}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="géométrie, algèbre, nombres décimaux"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={!formData.title || !formData.subject || !formData.grade_level}>
                  Publier
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Toutes matières" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes matières</SelectItem>
                {SUBJECTS.map((subject) => (
                  <SelectItem key={subject.value} value={subject.value}>
                    {subject.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tous niveaux" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous niveaux</SelectItem>
                {GRADE_LEVELS.map((grade) => (
                  <SelectItem key={grade.value} value={grade.value}>
                    {grade.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous types</SelectItem>
                {RESOURCE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resources Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2 mb-4" />
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune ressource trouvée</h3>
            <p className="text-muted-foreground mb-4">
              Soyez le premier à partager une ressource pédagogique!
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une ressource
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => {
            const typeInfo = getTypeInfo(resource.resource_type);
            const TypeIcon = typeInfo.icon;
            return (
              <Card key={resource.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <TypeIcon className="h-4 w-4 text-primary" />
                      </div>
                      <Badge variant="secondary">{typeInfo.label}</Badge>
                    </div>
                    {resource.trimester && (
                      <Badge variant="outline">T{resource.trimester}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2 line-clamp-2">{resource.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {resource.description || "Pas de description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {getSubjectLabel(resource.subject)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getGradeLabel(resource.grade_level)}
                    </Badge>
                  </div>
                  
                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {resource.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{resource.author_name || "Anonyme"}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {resource.downloads_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {resource.likes_count}
                      </span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full mt-3" size="sm">
                    Voir le contenu
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
