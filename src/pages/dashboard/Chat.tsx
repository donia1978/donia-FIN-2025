import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  MessageSquare, 
  Send, 
  Plus, 
  Search,
  Loader2,
  Users,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string | null;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  last_message?: string;
  other_participant?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    email: string;
    full_name: string | null;
  };
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
}

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newConversationDialog, setNewConversationDialog] = useState(false);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    // Get conversations where user is a participant
    const { data: participations, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (partError) {
      toast.error("Erreur lors du chargement des conversations");
      setLoading(false);
      return;
    }

    if (!participations || participations.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const conversationIds = participations.map(p => p.conversation_id);

    const { data: convs, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false });

    if (convError) {
      toast.error("Erreur lors du chargement des conversations");
      setLoading(false);
      return;
    }

    // Get other participants for each conversation
    const conversationsWithParticipants = await Promise.all(
      (convs || []).map(async (conv) => {
        const { data: participants } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conv.id)
          .neq("user_id", user.id);

        let otherParticipant = null;
        if (participants && participants.length > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .eq("id", participants[0].user_id)
            .single();
          otherParticipant = profile;
        }

        // Get last message
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...conv,
          other_participant: otherParticipant,
          last_message: lastMsg?.content
        };
      })
    );

    setConversations(conversationsWithParticipants);
    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erreur lors du chargement des messages");
      return;
    }

    // Get sender profiles
    const messagesWithSenders = await Promise.all(
      (data || []).map(async (msg) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", msg.sender_id)
          .single();
        return { ...msg, sender: profile };
      })
    );

    setMessages(messagesWithSenders);
  };

  const fetchAllUsers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .neq("id", user.id);
    setAllUsers(data || []);
  };

  useEffect(() => {
    fetchConversations();
    fetchAllUsers();
  }, [user]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Get sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", newMsg.sender_id)
            .single();
          
          setMessages(prev => [...prev, { ...newMsg, sender: profile }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    await fetchMessages(conv.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setSendingMessage(true);
    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: newMessage.trim()
      });

    if (error) {
      toast.error("Erreur lors de l'envoi du message");
    } else {
      setNewMessage("");
      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);
    }
    setSendingMessage(false);
  };

  const handleCreateConversation = async () => {
    if (!selectedUserId || !user) return;

    // Check if conversation already exists
    const { data: existingParticipations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (existingParticipations) {
      for (const part of existingParticipations) {
        const { data: otherPart } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", part.conversation_id)
          .eq("user_id", selectedUserId)
          .maybeSingle();

        if (otherPart) {
          // Conversation exists, select it
          const conv = conversations.find(c => c.id === part.conversation_id);
          if (conv) {
            setSelectedConversation(conv);
            setNewConversationDialog(false);
            setSelectedUserId("");
            return;
          }
        }
      }
    }

    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({ is_group: false })
      .select()
      .single();

    if (convError || !newConv) {
      toast.error("Erreur lors de la création de la conversation");
      return;
    }

    // Add both participants
    const { error: partError } = await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: newConv.id, user_id: user.id },
        { conversation_id: newConv.id, user_id: selectedUserId }
      ]);

    if (partError) {
      toast.error("Erreur lors de l'ajout des participants");
      return;
    }

    toast.success("Conversation créée !");
    setNewConversationDialog(false);
    setSelectedUserId("");
    fetchConversations();
  };

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || "??";
  };

  const filteredConversations = conversations.filter(conv => {
    const name = conv.other_participant?.full_name || conv.other_participant?.email || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-120px)] gap-4">
        {/* Conversations List */}
        <Card className="w-80 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Messages</CardTitle>
              <Dialog open={newConversationDialog} onOpenChange={setNewConversationDialog}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvelle conversation</DialogTitle>
                    <DialogDescription>
                      Sélectionnez un utilisateur pour démarrer une conversation
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label>Utilisateur</Label>
                    <ScrollArea className="h-60 mt-2 border rounded-lg">
                      {allUsers.map((profile) => (
                        <button
                          key={profile.id}
                          onClick={() => setSelectedUserId(profile.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors",
                            selectedUserId === profile.id && "bg-accent"
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(profile.full_name, profile.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="text-sm font-medium">
                              {profile.full_name || profile.email}
                            </p>
                            {profile.full_name && (
                              <p className="text-xs text-muted-foreground">{profile.email}</p>
                            )}
                          </div>
                        </button>
                      ))}
                      {allUsers.length === 0 && (
                        <p className="p-4 text-center text-muted-foreground text-sm">
                          Aucun utilisateur disponible
                        </p>
                      )}
                    </ScrollArea>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewConversationDialog(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleCreateConversation} disabled={!selectedUserId}>
                      Créer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Aucune conversation
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors",
                        selectedConversation?.id === conv.id && "bg-accent"
                      )}
                    >
                      <Avatar>
                        <AvatarFallback>
                          {conv.is_group ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            getInitials(
                              conv.other_participant?.full_name,
                              conv.other_participant?.email
                            )
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium truncate">
                          {conv.title || conv.other_participant?.full_name || conv.other_participant?.email || "Conversation"}
                        </p>
                        {conv.last_message && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.last_message}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b pb-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {selectedConversation.is_group ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        getInitials(
                          selectedConversation.other_participant?.full_name,
                          selectedConversation.other_participant?.email
                        )
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedConversation.title || 
                       selectedConversation.other_participant?.full_name || 
                       selectedConversation.other_participant?.email || 
                       "Conversation"}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-3",
                            isOwn && "flex-row-reverse"
                          )}
                        >
                          {!isOwn && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(msg.sender?.full_name, msg.sender?.email)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={cn(
                            "max-w-[70%] space-y-1",
                            isOwn && "items-end"
                          )}>
                            <div className={cn(
                              "rounded-2xl px-4 py-2",
                              isOwn 
                                ? "bg-primary text-primary-foreground rounded-br-md" 
                                : "bg-muted rounded-bl-md"
                            )}>
                              <p className="text-sm">{msg.content}</p>
                            </div>
                            <p className={cn(
                              "text-xs text-muted-foreground",
                              isOwn && "text-right"
                            )}>
                              {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    placeholder="Écrivez un message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sendingMessage}
                  />
                  <Button type="submit" disabled={sendingMessage || !newMessage.trim()}>
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex flex-col items-center justify-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Sélectionnez une conversation pour commencer
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setNewConversationDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle conversation
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
