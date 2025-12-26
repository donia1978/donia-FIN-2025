import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Cloud as CloudIcon,
  Upload,
  Download,
  Trash2,
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  FolderPlus,
  Folder,
  Share2,
  Lock,
  Unlock,
  Search,
  Grid,
  List,
  MoreVertical,
  Star,
  Clock,
  HardDrive,
  Filter
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StorageFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mime_type: string;
  is_public: boolean;
  folder: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

interface StorageStats {
  total_files: number;
  total_size: number;
  by_category: { category: string; count: number; size: number }[];
}

const FILE_CATEGORIES = {
  document: { icon: FileText, label: "Documents", color: "text-blue-500" },
  image: { icon: Image, label: "Images", color: "text-green-500" },
  video: { icon: Video, label: "Vidéos", color: "text-purple-500" },
  audio: { icon: Music, label: "Audio", color: "text-pink-500" },
  archive: { icon: Archive, label: "Archives", color: "text-yellow-500" },
  other: { icon: File, label: "Autres", color: "text-gray-500" },
};

export default function Cloud() {
  const { user } = useAuth();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<StorageFile[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    if (user) {
      fetchFiles();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    filterFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, searchQuery, selectedCategory, currentFolder]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("storage_files")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue";
      toast.error("Erreur lors du chargement des fichiers", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from("storage_files")
        .select("size, category")
        .eq("user_id", user?.id);

      if (error) throw error;

      const total_size = data?.reduce((sum, file) => sum + file.size, 0) || 0;
      const by_category = Object.keys(FILE_CATEGORIES).map((category) => {
        const categoryFiles = data?.filter((f) => f.category === category) || [];
        return {
          category,
          count: categoryFiles.length,
          size: categoryFiles.reduce((sum, f) => sum + f.size, 0),
        };
      });

      setStats({
        total_files: data?.length || 0,
        total_size,
        by_category,
      });
    } catch (error) {
      toast.error("Erreur lors du chargement des statistiques");
      console.error("Stats fetch error:", error);
    }
  };

  const filterFiles = () => {
    let filtered = files;

    if (currentFolder !== null) {
      filtered = filtered.filter((f) => f.folder === currentFolder);
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((f) => f.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredFiles(filtered);
  };

  const getCategoryFromMimeType = (mimeType: string): string => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (
      mimeType.includes("pdf") ||
      mimeType.includes("document") ||
      mimeType.includes("text")
    )
      return "document";
    if (mimeType.includes("zip") || mimeType.includes("rar")) return "archive";
    return "other";
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Aucun fichier sélectionné");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = selectedFiles.length;
      let completed = 0;

      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user?.id}/${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("user-files")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const category = getCategoryFromMimeType(file.type);

        const { error: dbError } = await supabase.from("storage_files").insert({
          user_id: user?.id,
          name: file.name,
          path: uploadData.path,
          size: file.size,
          mime_type: file.type,
          category,
          folder: currentFolder,
          is_public: false,
        });

        if (dbError) throw dbError;

        completed++;
        setUploadProgress((completed / totalFiles) * 100);
      }

      toast.success("Fichiers téléchargés avec succès");
      setUploadDialogOpen(false);
      setSelectedFiles([]);
      fetchFiles();
      fetchStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue";
      toast.error("Erreur lors du téléchargement", {
        description: message,
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (file: StorageFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("user-files")
        .download(file.path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Téléchargement démarré");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue";
      toast.error("Erreur lors du téléchargement", {
        description: message,
      });
    }
  };

  const handleDelete = async (file: StorageFile) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${file.name}" ?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("user-files")
        .remove([file.path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("storage_files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;

      toast.success("Fichier supprimé");
      fetchFiles();
      fetchStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue";
      toast.error("Erreur lors de la suppression", {
        description: message,
      });
    }
  };

  const handleTogglePublic = async (file: StorageFile) => {
    try {
      const { error } = await supabase
        .from("storage_files")
        .update({ is_public: !file.is_public })
        .eq("id", file.id);

      if (error) throw error;

      toast.success(
        file.is_public
          ? "Fichier rendu privé"
          : "Fichier rendu public"
      );
      fetchFiles();
    } catch (error) {
      toast.error("Erreur lors de la modification");
      console.error("Toggle public error:", error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Veuillez entrer un nom de dossier");
      return;
    }

    setCreateFolderDialogOpen(false);
    setNewFolderName("");
    toast.success("Dossier créé (simulation)");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const storageLimit = 5 * 1024 * 1024 * 1024; // 5GB
  const usedPercentage = stats ? (stats.total_size / storageLimit) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CloudIcon className="h-8 w-8" />
              Donia Cloud
            </h1>
            <p className="text-muted-foreground">
              Stockage sécurisé pour vos fichiers pédagogiques et médicaux
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateFolderDialogOpen(true)}
              className="gap-2"
            >
              <FolderPlus className="h-4 w-4" />
              Nouveau dossier
            </Button>
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Télécharger
            </Button>
          </div>
        </div>

        {/* Storage Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Espace de stockage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>
                  {formatFileSize(stats?.total_size || 0)} utilisés sur{" "}
                  {formatFileSize(storageLimit)}
                </span>
                <span>{usedPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={usedPercentage} className="h-2" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {stats?.by_category.map((cat) => {
                const CategoryIcon = FILE_CATEGORIES[cat.category as keyof typeof FILE_CATEGORIES]?.icon || File;
                const color = FILE_CATEGORIES[cat.category as keyof typeof FILE_CATEGORIES]?.color || "text-gray-500";
                return (
                  <div key={cat.category} className="text-center">
                    <CategoryIcon className={`h-6 w-6 mx-auto mb-1 ${color}`} />
                    <p className="text-xs text-muted-foreground">
                      {cat.count} fichiers
                    </p>
                    <p className="text-xs font-medium">{formatFileSize(cat.size)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher des fichiers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {Object.entries(FILE_CATEGORIES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Files */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentFolder ? `Dossier: ${currentFolder}` : "Mes fichiers"}
            </CardTitle>
            <CardDescription>
              {filteredFiles.length} fichier{filteredFiles.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <CloudIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Aucun fichier trouvé
                </p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Télécharger des fichiers
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredFiles.map((file) => {
                  const CategoryIcon = FILE_CATEGORIES[file.category as keyof typeof FILE_CATEGORIES]?.icon || File;
                  const color = FILE_CATEGORIES[file.category as keyof typeof FILE_CATEGORIES]?.color || "text-gray-500";
                  return (
                    <Card key={file.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative">
                            <CategoryIcon className={`h-12 w-12 ${color}`} />
                            {file.is_public && (
                              <Unlock className="h-4 w-4 absolute -top-1 -right-1 text-green-500" />
                            )}
                          </div>
                          <p className="text-sm font-medium text-center truncate w-full">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(file.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                          <div className="flex gap-1 w-full">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleDownload(file)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() => handleTogglePublic(file)}
                                >
                                  {file.is_public ? (
                                    <>
                                      <Lock className="h-4 w-4 mr-2" />
                                      Rendre privé
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="h-4 w-4 mr-2" />
                                      Rendre public
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(file)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map((file) => {
                  const CategoryIcon = FILE_CATEGORIES[file.category as keyof typeof FILE_CATEGORIES]?.icon || File;
                  const color = FILE_CATEGORIES[file.category as keyof typeof FILE_CATEGORIES]?.color || "text-gray-500";
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon className={`h-5 w-5 ${color}`} />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)} •{" "}
                            {formatDistanceToNow(new Date(file.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.is_public ? (
                          <Badge variant="outline" className="gap-1">
                            <Unlock className="h-3 w-3" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Privé
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => handleTogglePublic(file)}
                            >
                              {file.is_public ? (
                                <>
                                  <Lock className="h-4 w-4 mr-2" />
                                  Rendre privé
                                </>
                              ) : (
                                <>
                                  <Unlock className="h-4 w-4 mr-2" />
                                  Rendre public
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(file)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Télécharger des fichiers</DialogTitle>
            <DialogDescription>
              Sélectionnez les fichiers à télécharger vers Donia Cloud
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Fichiers</Label>
              <Input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </div>
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {selectedFiles.length} fichier{selectedFiles.length !== 1 ? "s" : ""}{" "}
                  sélectionné{selectedFiles.length !== 1 ? "s" : ""}
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="text-sm text-muted-foreground flex justify-between"
                    >
                      <span className="truncate">{file.name}</span>
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {uploading && (
              <div>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  Téléchargement en cours... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              disabled={uploading}
            >
              Annuler
            </Button>
            <Button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0}>
              {uploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Téléchargement...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Télécharger
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau dossier</DialogTitle>
            <DialogDescription>
              Organisez vos fichiers en créant des dossiers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Nom du dossier</Label>
              <Input
                id="folder-name"
                placeholder="Mon dossier"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateFolderDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleCreateFolder}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
