import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  userId: string;
  variant?: "default" | "compact";
  className?: string;
}

export function FollowButton({ userId, variant = "default", className }: FollowButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isFollowing, isLoading } = useQuery({
    queryKey: ["is-following", userId],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id && userId !== user?.id
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Non authentifié");
      
      const { error } = await supabase
        .from("user_follows")
        .insert({ follower_id: user.id, following_id: userId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", userId] });
      queryClient.invalidateQueries({ queryKey: ["following-users"] });
      queryClient.invalidateQueries({ queryKey: ["followers-count"] });
      toast.success("Vous suivez maintenant cet utilisateur");
    },
    onError: () => toast.error("Erreur lors du suivi")
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Non authentifié");
      
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", userId] });
      queryClient.invalidateQueries({ queryKey: ["following-users"] });
      queryClient.invalidateQueries({ queryKey: ["followers-count"] });
      toast.success("Vous ne suivez plus cet utilisateur");
    },
    onError: () => toast.error("Erreur lors du désabonnement")
  });

  if (userId === user?.id) return null;

  const isPending = followMutation.isPending || unfollowMutation.isPending;

  if (variant === "compact") {
    return (
      <Button
        variant={isFollowing ? "secondary" : "default"}
        size="sm"
        className={cn("h-7 text-xs", className)}
        onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
        disabled={isPending || isLoading}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isFollowing ? (
          <>
            <UserMinus className="h-3 w-3 mr-1" />
            Suivi
          </>
        ) : (
          <>
            <UserPlus className="h-3 w-3 mr-1" />
            Suivre
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      className={className}
      onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
      disabled={isPending || isLoading}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-2" />
          Ne plus suivre
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Suivre
        </>
      )}
    </Button>
  );
}
