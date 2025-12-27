import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, MessageCircle, Share2, Image, Send, MoreHorizontal, Bookmark, Users, TrendingUp, Sparkles, Wand2, X, Loader2, Camera, Trash2, Edit, Flag, BookmarkCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Stories } from "@/components/social/Stories";
import { PostComments } from "@/components/social/PostComments";
import { FollowButton } from "@/components/social/FollowButton";
import { ReportDialog } from "@/components/social/ReportDialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[] | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  liked_by_user?: boolean;
  bookmarked_by_user?: boolean;
}

const AI_PROMPTS_SUGGESTIONS = [
  "Un coucher de soleil sur l'océan avec des couleurs vibrantes",
  "Une forêt enchantée avec des lumières féeriques",
  "Un paysage de montagne enneigée au lever du jour",
  "Une ville futuriste illuminée la nuit",
  "Un jardin japonais zen avec des fleurs de cerisier",
  "Un espace cosmique avec des nébuleuses colorées",
];

export default function Social() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newPost, setNewPost] = useState("");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  
  // Media state
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [mediaMode, setMediaMode] = useState<"upload" | "ai">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingMediaUrl, setPendingMediaUrl] = useState<string | null>(null);
  
  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiPreviewBase64, setAiPreviewBase64] = useState<string | null>(null);

  // Post management state
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  // Fetch following users
  const { data: followingIds = [] } = useQuery({
    queryKey: ["following-users", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);
      return data?.map(f => f.following_id) || [];
    },
    enabled: !!user?.id
  });

  // Fetch bookmarked post IDs
  const { data: bookmarkedPostIds = [] } = useQuery({
    queryKey: ["bookmarked-posts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("post_bookmarks")
        .select("post_id")
        .eq("user_id", user.id);
      return data?.map(b => b.post_id) || [];
    },
    enabled: !!user?.id
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["social-posts"],
    queryFn: async () => {
      const { data: postsData, error } = await supabase
        .from("social_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      let likedPostIds: string[] = [];
      if (user) {
        const { data: likes } = await supabase
          .from("social_likes")
          .select("post_id")
          .eq("user_id", user.id);
        likedPostIds = likes?.map(l => l.post_id) || [];
      }

      return postsData?.map(post => ({
        ...post,
        profile: profiles?.find(p => p.id === post.user_id),
        liked_by_user: likedPostIds.includes(post.id),
        bookmarked_by_user: bookmarkedPostIds.includes(post.id)
      })) as Post[];
    },
    enabled: !!user
  });

  // Filtered posts for tabs
  const followingPosts = posts?.filter(p => followingIds.includes(p.user_id)) || [];
  const savedPosts = posts?.filter(p => bookmarkedPostIds.includes(p.id)) || [];

  const createPostMutation = useMutation({
    mutationFn: async ({ content, mediaUrls }: { content: string; mediaUrls?: string[] }) => {
      const { error } = await supabase.from("social_posts").insert({
        user_id: user!.id,
        content,
        media_urls: mediaUrls || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      resetPostForm();
      toast.success("Publication créée");
    },
    onError: () => toast.error("Erreur lors de la création")
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const { error } = await supabase
        .from("social_posts")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", postId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      setEditingPost(null);
      setEditContent("");
      toast.success("Publication modifiée");
    },
    onError: () => toast.error("Erreur lors de la modification")
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("social_posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      setDeletingPostId(null);
      toast.success("Publication supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression")
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        await supabase.from("social_likes").delete().eq("post_id", postId).eq("user_id", user!.id);
        await supabase.from("social_posts").update({ likes_count: posts!.find(p => p.id === postId)!.likes_count - 1 }).eq("id", postId);
      } else {
        await supabase.from("social_likes").insert({ post_id: postId, user_id: user!.id });
        await supabase.from("social_posts").update({ likes_count: posts!.find(p => p.id === postId)!.likes_count + 1 }).eq("id", postId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social-posts"] })
  });

  const toggleBookmarkMutation = useMutation({
    mutationFn: async ({ postId, bookmarked }: { postId: string; bookmarked: boolean }) => {
      if (bookmarked) {
        await supabase.from("post_bookmarks").delete().eq("post_id", postId).eq("user_id", user!.id);
      } else {
        await supabase.from("post_bookmarks").insert({ post_id: postId, user_id: user!.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarked-posts"] });
    }
  });

  const resetPostForm = () => {
    setNewPost("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setPendingMediaUrl(null);
    setAiPrompt("");
    setAiPreviewBase64(null);
  };

  const resetMediaDialog = () => {
    setShowMediaDialog(false);
    setMediaMode("upload");
    setSelectedFile(null);
    setPreviewUrl(null);
    setAiPrompt("");
    setAiPreviewBase64(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.");
      return;
    }
    
    if (file.size > 10485760) {
      toast.error("Fichier trop volumineux. Maximum 10MB.");
      return;
    }
    
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMediaMode("upload");
  };

  const uploadFileAndGetUrl = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user!.id}/post-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("stories")
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage
      .from("stories")
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

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

      setAiPreviewBase64(data.base64);
      setPendingMediaUrl(data.image_url);
      toast.success("Image générée avec succès !");
    } catch (error) {
      console.error("AI generation error:", error);
      const message = error instanceof Error ? error.message : "Erreur lors de la génération";
      toast.error(message);
    } finally {
      setGeneratingAI(false);
    }
  };

  const confirmMedia = async () => {
    if (mediaMode === "upload" && selectedFile) {
      try {
        const url = await uploadFileAndGetUrl(selectedFile);
        setPendingMediaUrl(url);
        setPreviewUrl(url);
        toast.success("Image ajoutée");
      } catch (error) {
        toast.error("Erreur lors de l'upload");
        return;
      }
    } else if (mediaMode === "ai" && aiPreviewBase64) {
      setPreviewUrl(aiPreviewBase64);
    }
    setShowMediaDialog(false);
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !pendingMediaUrl) return;
    
    const mediaUrls = pendingMediaUrl ? [pendingMediaUrl] : undefined;
    createPostMutation.mutate({ content: newPost, mediaUrls });
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleShare = async (post: Post) => {
    try {
      await navigator.share({
        title: "Partager la publication",
        text: post.content.substring(0, 100),
        url: window.location.origin + `/post/${post.id}`
      });
    } catch {
      await navigator.clipboard.writeText(post.content);
      toast.success("Contenu copié !");
    }
  };

  const startEditing = (post: Post) => {
    setEditingPost(post);
    setEditContent(post.content);
  };

  const renderPost = (post: Post) => (
    <Card key={post.id} className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <Avatar>
              <AvatarImage src={post.profile?.avatar_url || ""} />
              <AvatarFallback>
                {post.profile?.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{post.profile?.full_name || "Utilisateur"}</p>
                {post.user_id !== user?.id && (
                  <FollowButton userId={post.user_id} variant="compact" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(post.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleBookmarkMutation.mutate({ postId: post.id, bookmarked: !!post.bookmarked_by_user || bookmarkedPostIds.includes(post.id) })}>
                {bookmarkedPostIds.includes(post.id) ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 mr-2 text-primary" />
                    Enregistré
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </DropdownMenuItem>
              {post.user_id === user?.id && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => startEditing(post)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDeletingPostId(post.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
              {post.user_id !== user?.id && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setReportingPostId(post.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Signaler
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap">{post.content}</p>
        
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="grid gap-2">
            {post.media_urls.map((url, i) => (
              <img key={i} src={url} alt="" className="rounded-lg w-full object-cover max-h-96" />
            ))}
          </div>
        )}

        <div className="flex items-center gap-6 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className={post.liked_by_user ? "text-red-500 hover:text-red-600" : ""}
            onClick={() => toggleLikeMutation.mutate({ postId: post.id, liked: !!post.liked_by_user })}
          >
            <Heart className={`h-4 w-4 mr-2 ${post.liked_by_user ? "fill-current" : ""}`} />
            {post.likes_count}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => toggleComments(post.id)}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {post.comments_count}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleShare(post)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Partager
          </Button>
        </div>

        {/* Comments Section */}
        {expandedComments.has(post.id) && (
          <PostComments 
            postId={post.id} 
            onCommentAdded={() => {
              queryClient.invalidateQueries({ queryKey: ["social-posts"] });
            }}
          />
        )}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Communauté</h1>
            <p className="text-muted-foreground">Partagez avec la communauté DoniaSocial</p>
          </div>
        </div>

        {/* Stories */}
        <Card className="p-4">
          <Stories />
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="feed" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="feed" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Fil
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2">
              <Users className="h-4 w-4" />
              Abonnements
              {followingIds.length > 0 && (
                <span className="ml-1 text-xs bg-primary/20 rounded-full px-1.5">{followingIds.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="h-4 w-4" />
              Enregistrés
              {bookmarkedPostIds.length > 0 && (
                <span className="ml-1 text-xs bg-primary/20 rounded-full px-1.5">{bookmarkedPostIds.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            {/* Create Post */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <Textarea
                      placeholder="Partagez une actualité, une question, ou une réflexion..."
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                    
                    {/* Media Preview */}
                    {(previewUrl || pendingMediaUrl) && (
                      <div className="relative inline-block">
                        <img
                          src={previewUrl || pendingMediaUrl || ""}
                          alt="Preview"
                          className="max-h-48 rounded-lg object-cover"
                        />
                        {aiPreviewBase64 && (
                          <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            IA
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70 h-6 w-6"
                          onClick={() => {
                            setPreviewUrl(null);
                            setPendingMediaUrl(null);
                            setAiPreviewBase64(null);
                            setSelectedFile(null);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setShowMediaDialog(true);
                            setMediaMode("upload");
                          }}
                        >
                          <Image className="h-4 w-4 mr-2" />
                          Photo
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                          onClick={() => {
                            setShowMediaDialog(true);
                            setMediaMode("ai");
                          }}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Générer IA
                        </Button>
                      </div>
                      <Button 
                        onClick={handleCreatePost} 
                        disabled={(!newPost.trim() && !pendingMediaUrl) || createPostMutation.isPending}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Publier
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posts Feed */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : posts?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Aucune publication pour le moment. Soyez le premier à partager !
                </CardContent>
              </Card>
            ) : (
              posts?.map((post) => renderPost(post))
            )}
          </TabsContent>

          <TabsContent value="following" className="space-y-4">
            {followingIds.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Suivez des utilisateurs pour voir leurs publications ici</p>
                </CardContent>
              </Card>
            ) : followingPosts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune publication récente de vos abonnements</p>
                </CardContent>
              </Card>
            ) : (
              followingPosts.map((post) => renderPost(post))
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            {bookmarkedPostIds.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Vos publications enregistrées apparaîtront ici</p>
                </CardContent>
              </Card>
            ) : savedPosts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chargement de vos publications enregistrées...</p>
                </CardContent>
              </Card>
            ) : (
              savedPosts.map((post) => renderPost(post))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Media Dialog */}
      <Dialog open={showMediaDialog} onOpenChange={(open) => !open && resetMediaDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mediaMode === "ai" ? (
                <>
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Générer une image avec l'IA
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" />
                  Ajouter une photo
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={mediaMode} onValueChange={(v) => setMediaMode(v as "upload" | "ai")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-2">
                <Image className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Génération IA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-4">
              {previewUrl && selectedFile ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full max-h-80 rounded-lg object-contain bg-muted"
                  />
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
                  className="h-48 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                >
                  <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Cliquez pour choisir une photo
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG, GIF, WebP (max 10MB)
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
                  {AI_PROMPTS_SUGGESTIONS.slice(0, 3).map((suggestion, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setAiPrompt(suggestion)}
                    >
                      {suggestion.slice(0, 25)}...
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
                <div className="relative">
                  <img
                    src={aiPreviewBase64}
                    alt="AI Generated"
                    className="w-full max-h-80 rounded-lg object-contain bg-muted"
                  />
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Généré par IA
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Confirm button */}
          {((mediaMode === "upload" && selectedFile) || (mediaMode === "ai" && aiPreviewBase64)) && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={resetMediaDialog}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={confirmMedia}
              >
                Utiliser cette image
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Modifier la publication
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={5}
            className="resize-none"
          />
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setEditingPost(null)}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={() => editingPost && updatePostMutation.mutate({ postId: editingPost.id, content: editContent })}
              disabled={!editContent.trim() || updatePostMutation.isPending}
            >
              {updatePostMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPostId} onOpenChange={(open) => !open && setDeletingPostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la publication ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La publication et tous ses commentaires seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPostId && deletePostMutation.mutate(deletingPostId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePostMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      {reportingPostId && (
        <ReportDialog
          postId={reportingPostId}
          open={!!reportingPostId}
          onOpenChange={(open) => !open && setReportingPostId(null)}
        />
      )}
    </DashboardLayout>
  );
}
