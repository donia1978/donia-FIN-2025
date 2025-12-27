import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface StoryReactionsProps {
  storyId: string;
  storyOwnerId: string;
  onReactionSent?: () => void;
}

const EMOJI_REACTIONS = ["❤️", "😂", "😮", "😢", "👏", "🔥"];

export function StoryReactions({ storyId, storyOwnerId, onReactionSent }: StoryReactionsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const reactionMutation = useMutation({
    mutationFn: async (reaction: string) => {
      if (!user?.id) throw new Error("Non authentifié");
      
      // Check if reaction exists
      const { data: existing } = await supabase
        .from("story_reactions")
        .select("id")
        .eq("story_id", storyId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("story_reactions")
          .update({ reaction })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("story_reactions")
          .insert({ story_id: storyId, user_id: user.id, reaction });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story-reactions", storyId] });
      toast.success("Réaction envoyée !");
      onReactionSent?.();
    },
    onError: () => toast.error("Erreur lors de l'envoi de la réaction")
  });

  const sendReply = async () => {
    if (!replyText.trim() || !user?.id) return;
    
    setSendingReply(true);
    try {
      const { error } = await supabase
        .from("story_replies")
        .insert({
          story_id: storyId,
          user_id: user.id,
          content: replyText.trim()
        });
      
      if (error) throw error;
      
      setReplyText("");
      toast.success("Réponse envoyée !");
      onReactionSent?.();
    } catch {
      toast.error("Erreur lors de l'envoi de la réponse");
    } finally {
      setSendingReply(false);
    }
  };

  // Don't show reactions on own stories
  if (storyOwnerId === user?.id) return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-30 space-y-2">
      {/* Emoji reactions */}
      <div className="flex justify-center gap-2">
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => reactionMutation.mutate(emoji)}
            disabled={reactionMutation.isPending}
            className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-lg transition-transform hover:scale-110 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
      
      {/* Reply input */}
      <div className="flex gap-2">
        <Input
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Répondre à la story..."
          className="bg-black/50 border-white/20 text-white placeholder:text-white/50"
          onKeyDown={(e) => e.key === "Enter" && sendReply()}
        />
        <Button
          size="icon"
          onClick={sendReply}
          disabled={!replyText.trim() || sendingReply}
          className="bg-primary hover:bg-primary/90"
        >
          {sendingReply ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
