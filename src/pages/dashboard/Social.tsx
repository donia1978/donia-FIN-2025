import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Image, Send, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
}

export default function Social() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["social-posts"],
    queryFn: async () => {
      const { data: postsData, error } = await supabase
        .from("social_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for each post
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      // Check if user liked each post
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
        liked_by_user: likedPostIds.includes(post.id)
      })) as Post[];
    },
    enabled: !!user
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("social_posts").insert({
        user_id: user!.id,
        content
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      setNewPost("");
      toast.success("Publication créée");
    },
    onError: () => toast.error("Erreur lors de la création")
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

  const handleCreatePost = () => {
    if (!newPost.trim()) return;
    createPostMutation.mutate(newPost);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fil d'actualité</h1>
          <p className="text-muted-foreground">Partagez avec la communauté</p>
        </div>

        {/* Create Post */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Avatar>
                <AvatarImage src="" />
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <Textarea
                  placeholder="Quoi de neuf ?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Image className="h-4 w-4 mr-2" />
                      Photo
                    </Button>
                  </div>
                  <Button onClick={handleCreatePost} disabled={!newPost.trim() || createPostMutation.isPending}>
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
          posts?.map((post) => (
            <Card key={post.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <Avatar>
                      <AvatarImage src={post.profile?.avatar_url || ""} />
                      <AvatarFallback>
                        {post.profile?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{post.profile?.full_name || "Utilisateur"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(post.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
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
                    className={post.liked_by_user ? "text-red-500" : ""}
                    onClick={() => toggleLikeMutation.mutate({ postId: post.id, liked: !!post.liked_by_user })}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${post.liked_by_user ? "fill-current" : ""}`} />
                    {post.likes_count}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {post.comments_count}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    {post.shares_count}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
