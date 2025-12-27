import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Camera, Video, ChevronLeft, ChevronRight, Eye, Loader2, Trash2, Sparkles, Wand2, Image as ImageIcon, Pause, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StoryReactions } from "./StoryReactions";

// Story timer constants
const STORY_DURATION = 5000; // 5 seconds
const PROGRESS_INTERVAL = 50; // Update every 50ms for smooth animation

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  views_count: number;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface GroupedStories {
  user_id: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  };
  stories: Story[];
  hasUnviewed: boolean;
}

const AI_PROMPTS_SUGGESTIONS = [
  "Un coucher de soleil sur l'océan avec des couleurs vibrantes",
  "Une forêt enchantée avec des lumières féeriques",
  "Un paysage de montagne enneigée au lever du jour",
  "Une ville futuriste illuminée la nuit",
  "Un jardin japonais zen avec des fleurs de cerisier",
  "Un espace cosmique avec des nébuleuses colorées",
  "Une plage tropicale paradisiaque",
  "Un château médiéval dans la brume",
];

export function Stories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedGroup, setSelectedGroup] = useState<GroupedStories | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createMode, setCreateMode] = useState<"upload" | "ai">("upload");
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiGeneratedUrl, setAiGeneratedUrl] = useState<string | null>(null);
  const [aiPreviewBase64, setAiPreviewBase64] = useState<string | null>(null);

  // Refs for timer management
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch stories
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles for each unique user
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(story => ({
        ...story,
        profile: profileMap.get(story.user_id) || { full_name: null, avatar_url: null }
      })) as Story[];
    },
    refetchInterval: 30000
  });

  // Fetch viewed stories for current user
  const { data: viewedStoryIds = [] } = useQuery({
    queryKey: ["viewed-stories", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", user.id);
      return data?.map(v => v.story_id) || [];
    },
    enabled: !!user?.id
  });

  // Group stories by user
  const groupedStories: GroupedStories[] = stories.reduce((groups: GroupedStories[], story) => {
    const existingGroup = groups.find(g => g.user_id === story.user_id);
    if (existingGroup) {
      existingGroup.stories.push(story);
      if (!viewedStoryIds.includes(story.id)) {
        existingGroup.hasUnviewed = true;
      }
    } else {
      groups.push({
        user_id: story.user_id,
        profile: story.profile || { full_name: null, avatar_url: null },
        stories: [story],
        hasUnviewed: !viewedStoryIds.includes(story.id)
      });
    }
    return groups;
  }, []);

  const myStories = groupedStories.find(g => g.user_id === user?.id);

  // Upload story mutation
  const uploadStory = useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption: string }) => {
      if (!user?.id) throw new Error("Non authentifié");
      
      setUploading(true);
      
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      
      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from("stories")
        .getPublicUrl(fileName);
      
      const { error: insertError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: urlData.publicUrl,
          media_type: mediaType,
          caption: caption || null
        });
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      resetCreateDialog();
      toast.success("Story publiée !");
    },
    onError: (error) => {
      toast.error("Erreur lors de la publication: " + error.message);
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  // Publish AI-generated story mutation
  const publishAIStory = useMutation({
    mutationFn: async ({ imageUrl, caption }: { imageUrl: string; caption: string }) => {
      if (!user?.id) throw new Error("Non authentifié");
      
      const { error: insertError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: imageUrl,
          media_type: "image",
          caption: caption || null
        });
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      resetCreateDialog();
      toast.success("Story IA publiée !");
    },
    onError: (error) => {
      toast.error("Erreur lors de la publication: " + error.message);
    }
  });

  // Mark story as viewed
  const markAsViewed = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user?.id) return;
      await supabase
        .from("story_views")
        .upsert({ story_id: storyId, viewer_id: user.id }, { onConflict: "story_id,viewer_id" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viewed-stories"] });
    }
  });

  // Delete story mutation
  const deleteStory = useMutation({
    mutationFn: async (story: Story) => {
      if (!user?.id || story.user_id !== user.id) throw new Error("Non autorisé");
      
      const fileName = story.media_url.split("/").pop();
      if (fileName) {
        await supabase.storage
          .from("stories")
          .remove([`${user.id}/${fileName}`]);
      }
      
      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", story.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      setSelectedGroup(null);
      toast.success("Story supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    }
  });

  // AI Generation function
  const generateAIImage = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Veuillez entrer une description");
      return;
    }

    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-media", {
        body: { prompt: aiPrompt, type: "image" }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setAiGeneratedUrl(data.image_url);
      setAiPreviewBase64(data.base64);
      toast.success("Image générée avec succès !");
    } catch (error) {
      console.error("AI generation error:", error);
      const message = error instanceof Error ? error.message : "Erreur lors de la génération";
      toast.error(message);
    } finally {
      setGeneratingAI(false);
    }
  };

  const resetCreateDialog = () => {
    setShowCreateDialog(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setAiPrompt("");
    setAiGeneratedUrl(null);
    setAiPreviewBase64(null);
    setCreateMode("upload");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime"];
    if (!validTypes.includes(file.type)) {
      toast.error("Type de fichier non supporté. Utilisez JPG, PNG, GIF, WebP, MP4 ou WebM.");
      return;
    }
    
    if (file.size > 52428800) {
      toast.error("Fichier trop volumineux. Maximum 50MB.");
      return;
    }
    
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setCreateMode("upload");
    setShowCreateDialog(true);
  };

  const handleCreateStory = () => {
    if (createMode === "ai" && aiGeneratedUrl) {
      publishAIStory.mutate({ imageUrl: aiGeneratedUrl, caption });
    } else if (selectedFile) {
      uploadStory.mutate({ file: selectedFile, caption });
    }
  };

  const openStoryViewer = (group: GroupedStories) => {
    setSelectedGroup(group);
    setCurrentStoryIndex(0);
    setStoryProgress(0);
    
    if (group.stories[0] && !viewedStoryIds.includes(group.stories[0].id)) {
      markAsViewed.mutate(group.stories[0].id);
    }
  };

  const goToNextStory = () => {
    if (!selectedGroup) return;
    
    if (currentStoryIndex < selectedGroup.stories.length - 1) {
      const nextIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIndex);
      setStoryProgress(0);
      
      if (!viewedStoryIds.includes(selectedGroup.stories[nextIndex].id)) {
        markAsViewed.mutate(selectedGroup.stories[nextIndex].id);
      }
    } else {
      const currentGroupIndex = groupedStories.findIndex(g => g.user_id === selectedGroup.user_id);
      if (currentGroupIndex < groupedStories.length - 1) {
        const nextGroup = groupedStories[currentGroupIndex + 1];
        setSelectedGroup(nextGroup);
        setCurrentStoryIndex(0);
        setStoryProgress(0);
        
        if (!viewedStoryIds.includes(nextGroup.stories[0].id)) {
          markAsViewed.mutate(nextGroup.stories[0].id);
        }
      } else {
        setSelectedGroup(null);
      }
    }
  };

  const goToPrevStory = () => {
    if (!selectedGroup) return;
    
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setStoryProgress(0);
    } else {
      const currentGroupIndex = groupedStories.findIndex(g => g.user_id === selectedGroup.user_id);
      if (currentGroupIndex > 0) {
        const prevGroup = groupedStories[currentGroupIndex - 1];
        setSelectedGroup(prevGroup);
        setCurrentStoryIndex(prevGroup.stories.length - 1);
        setStoryProgress(0);
      }
    }
  };

  const currentStory = selectedGroup?.stories[currentStoryIndex];

  // Memoized goToNextStory for useEffect dependency
  const goToNextStoryCallback = useCallback(() => {
    if (!selectedGroup) return;
    
    if (currentStoryIndex < selectedGroup.stories.length - 1) {
      const nextIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIndex);
      setStoryProgress(0);
      
      if (!viewedStoryIds.includes(selectedGroup.stories[nextIndex].id)) {
        markAsViewed.mutate(selectedGroup.stories[nextIndex].id);
      }
    } else {
      const currentGroupIndex = groupedStories.findIndex(g => g.user_id === selectedGroup.user_id);
      if (currentGroupIndex < groupedStories.length - 1) {
        const nextGroup = groupedStories[currentGroupIndex + 1];
        setSelectedGroup(nextGroup);
        setCurrentStoryIndex(0);
        setStoryProgress(0);
        
        if (!viewedStoryIds.includes(nextGroup.stories[0].id)) {
          markAsViewed.mutate(nextGroup.stories[0].id);
        }
      } else {
        setSelectedGroup(null);
      }
    }
  }, [selectedGroup, currentStoryIndex, groupedStories, viewedStoryIds, markAsViewed]);

  // Auto-advancement timer with animated progress bar
  useEffect(() => {
    // Don't run timer if no story selected, paused, or if it's a video
    if (!selectedGroup || !currentStory || currentStory.media_type === "video" || isPaused) {
      return;
    }

    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Start new interval for progress animation
    progressIntervalRef.current = setInterval(() => {
      setStoryProgress((prev) => {
        const increment = (PROGRESS_INTERVAL / STORY_DURATION) * 100;
        const newProgress = prev + increment;
        
        if (newProgress >= 100) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          // Use setTimeout to avoid state update during render
          setTimeout(() => goToNextStoryCallback(), 0);
          return 0;
        }
        return newProgress;
      });
    }, PROGRESS_INTERVAL);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [selectedGroup, currentStoryIndex, currentStory?.id, currentStory?.media_type, isPaused, goToNextStoryCallback]);

  // Reset pause state when story changes
  useEffect(() => {
    setIsPaused(false);
  }, [currentStoryIndex, selectedGroup?.user_id]);

  // Pause/Play handlers
  const handlePauseStart = () => setIsPaused(true);
  const handlePauseEnd = () => setIsPaused(false);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {/* Add Story Button */}
        <button
          onClick={() => {
            setShowCreateDialog(true);
            setCreateMode("upload");
          }}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-dashed border-muted-foreground/30">
              {myStories?.stories[0]?.media_url ? (
                <AvatarImage src={myStories.stories[0].media_url} />
              ) : (
                <AvatarFallback className="bg-muted">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <Plus className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
          <span className="text-xs text-muted-foreground">Ma story</span>
        </button>

        {/* AI Generation Button */}
        <button
          onClick={() => {
            setShowCreateDialog(true);
            setCreateMode("ai");
          }}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
          </div>
          <span className="text-xs text-muted-foreground">Créer IA</span>
        </button>

        {/* My Stories */}
        {myStories && (
          <button
            onClick={() => openStoryViewer(myStories)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className={cn(
              "p-0.5 rounded-full",
              myStories.hasUnviewed 
                ? "bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-500"
                : "bg-muted-foreground/30"
            )}>
              <Avatar className="h-16 w-16 border-2 border-background">
                <AvatarImage src={myStories.profile.avatar_url || ""} />
                <AvatarFallback>
                  {myStories.profile.full_name?.charAt(0) || "M"}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-[70px]">
              Mes stories ({myStories.stories.length})
            </span>
          </button>
        )}

        {/* Other Users' Stories */}
        {groupedStories
          .filter(g => g.user_id !== user?.id)
          .map((group) => (
            <button
              key={group.user_id}
              onClick={() => openStoryViewer(group)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className={cn(
                "p-0.5 rounded-full",
                group.hasUnviewed 
                  ? "bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-500"
                  : "bg-muted-foreground/30"
              )}>
                <Avatar className="h-16 w-16 border-2 border-background">
                  <AvatarImage src={group.profile.avatar_url || ""} />
                  <AvatarFallback>
                    {group.profile.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs text-muted-foreground truncate max-w-[70px]">
                {group.profile.full_name?.split(" ")[0] || "User"}
              </span>
            </button>
          ))}

        {isLoading && (
          <div className="flex items-center justify-center h-16 w-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Create Story Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => !open && resetCreateDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {createMode === "ai" ? (
                <>
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Créer avec l'IA
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" />
                  Créer une story
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as "upload" | "ai")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-2">
                <ImageIcon className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Génération IA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-4">
              {previewUrl && selectedFile ? (
                <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden max-h-[400px]">
                  {selectedFile.type.startsWith("video/") ? (
                    <video
                      src={previewUrl}
                      className="w-full h-full object-contain"
                      controls
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[9/16] max-h-[400px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                >
                  <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Cliquez pour choisir une photo ou vidéo
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG, GIF, WebP, MP4, WebM (max 50MB)
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Décrivez l'image que vous souhaitez générer..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                
                {/* Suggestions */}
                <div className="flex flex-wrap gap-2">
                  {AI_PROMPTS_SUGGESTIONS.slice(0, 4).map((suggestion, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setAiPrompt(suggestion)}
                    >
                      {suggestion.slice(0, 30)}...
                    </Button>
                  ))}
                </div>

                <Button
                  onClick={generateAIImage}
                  disabled={generatingAI || !aiPrompt.trim()}
                  className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {generatingAI ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Générer l'image
                    </>
                  )}
                </Button>
              </div>

              {/* AI Preview */}
              {aiPreviewBase64 && (
                <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden max-h-[400px]">
                  <img
                    src={aiPreviewBase64}
                    alt="AI Generated"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Généré par IA
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 left-2 bg-black/50 text-white hover:bg-black/70"
                    onClick={() => {
                      setAiGeneratedUrl(null);
                      setAiPreviewBase64(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Caption and publish */}
          {((createMode === "upload" && selectedFile) || (createMode === "ai" && aiGeneratedUrl)) && (
            <div className="space-y-4 pt-4 border-t">
              <Textarea
                placeholder="Ajouter une légende (optionnel)..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
              />
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetCreateDialog}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleCreateStory}
                  disabled={uploading || publishAIStory.isPending}
                >
                  {(uploading || publishAIStory.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publication...
                    </>
                  ) : (
                    "Publier"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Story Viewer Modal */}
      <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-black border-none">
          {currentStory && (
            <div 
              className="relative aspect-[9/16] flex items-center justify-center"
              onMouseDown={handlePauseStart}
              onMouseUp={handlePauseEnd}
              onMouseLeave={handlePauseEnd}
              onTouchStart={handlePauseStart}
              onTouchEnd={handlePauseEnd}
            >
              {/* Progress bars - animated */}
              <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
                {selectedGroup?.stories.map((_, idx) => (
                  <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{
                        width: idx < currentStoryIndex 
                          ? "100%" 
                          : idx === currentStoryIndex 
                            ? `${storyProgress}%` 
                            : "0%",
                        transition: idx === currentStoryIndex ? `width ${PROGRESS_INTERVAL}ms linear` : "none"
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Pause indicator */}
              {isPaused && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                  <div className="bg-black/50 rounded-full p-4">
                    <Pause className="h-8 w-8 text-white" />
                  </div>
                </div>
              )}

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-8 right-2 text-white hover:bg-white/20 z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedGroup(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Pause/Play toggle button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-8 right-24 text-white hover:bg-white/20 z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(!isPaused);
                }}
              >
                {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </Button>

              {/* Delete button (for own stories) */}
              {currentStory.user_id === user?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-8 right-12 text-white hover:bg-white/20 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteStory.mutate(currentStory);
                  }}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
              
              {/* User info */}
              <div className="absolute top-8 left-2 flex items-center gap-2 z-20">
                <Avatar className="h-8 w-8 border border-white">
                  <AvatarImage src={selectedGroup?.profile.avatar_url || ""} />
                  <AvatarFallback className="text-xs bg-primary">
                    {selectedGroup?.profile.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-white text-sm font-medium">
                    {selectedGroup?.profile.full_name}
                  </span>
                  <p className="text-white/70 text-xs">
                    {new Date(currentStory.created_at).toLocaleTimeString("fr-FR", { 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })}
                  </p>
                </div>
              </div>

              {/* Navigation areas - don't interfere with reactions */}
              <button
                className="absolute left-0 top-0 bottom-20 w-1/3 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevStory();
                }}
              />
              <button
                className="absolute right-0 top-0 bottom-20 w-1/3 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextStory();
                }}
              />

              {/* Navigation arrows */}
              {currentStoryIndex > 0 || groupedStories.findIndex(g => g.user_id === selectedGroup?.user_id) > 0 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevStory();
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              ) : null}

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextStory();
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>

              {/* Story content */}
              {currentStory.media_type === "video" ? (
                <video
                  src={currentStory.media_url}
                  className="w-full h-full object-contain pointer-events-none"
                  autoPlay
                  playsInline
                  muted={false}
                  onEnded={goToNextStory}
                />
              ) : (
                <img
                  src={currentStory.media_url}
                  alt="Story"
                  className="w-full h-full object-contain pointer-events-none"
                />
              )}

              {/* Caption - positioned above reactions for own stories */}
              {currentStory.caption && currentStory.user_id === user?.id && (
                <div className="absolute bottom-16 left-4 right-4 bg-black/50 rounded-lg p-3 z-20">
                  <p className="text-white text-sm">{currentStory.caption}</p>
                </div>
              )}

              {/* Caption - positioned above reactions for others' stories */}
              {currentStory.caption && currentStory.user_id !== user?.id && (
                <div className="absolute bottom-32 left-4 right-4 bg-black/50 rounded-lg p-3 z-20">
                  <p className="text-white text-sm">{currentStory.caption}</p>
                </div>
              )}

              {/* Views count (for own stories) */}
              {currentStory.user_id === user?.id && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1 text-white/70 z-20">
                  <Eye className="h-4 w-4" />
                  <span className="text-xs">{currentStory.views_count}</span>
                </div>
              )}

              {/* Story Reactions (for other users' stories) */}
              {currentStory.user_id !== user?.id && (
                <StoryReactions
                  storyId={currentStory.id}
                  storyOwnerId={currentStory.user_id}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
