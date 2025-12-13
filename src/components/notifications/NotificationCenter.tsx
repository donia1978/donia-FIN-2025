import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, X, Calendar, Mail, Smartphone, ExternalLink, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean | null;
  created_at: string;
}

interface NotificationPreferences {
  notification_email: boolean;
  notification_push: boolean;
  notification_sms: boolean;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notification_email: true,
    notification_push: true,
    notification_sms: false,
  });
  const [calendarUrl, setCalendarUrl] = useState("");

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPreferences();
      generateCalendarUrl();
      
      // Subscribe to real-time notifications
      const channel = supabase
        .channel('notifications-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show browser notification if permitted
            if (Notification.permission === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/favicon.ico',
              });
            }
            
            toast.info(newNotification.title, {
              description: newNotification.message,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const fetchPreferences = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('notification_email, notification_push, notification_sms')
      .eq('id', user.id)
      .single();

    if (data) {
      setPreferences({
        notification_email: data.notification_email ?? true,
        notification_push: data.notification_push ?? true,
        notification_sms: data.notification_sms ?? false,
      });
    }
  };

  const generateCalendarUrl = () => {
    if (!user) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed?user_id=${user.id}`;
    setCalendarUrl(url);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("Toutes les notifications marquées comme lues");
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ [key]: value })
      .eq('id', user.id);

    if (!error) {
      setPreferences(prev => ({ ...prev, [key]: value }));
      toast.success("Préférences mises à jour");
    }
  };

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success("Notifications push activées");
        updatePreference('notification_push', true);
      } else {
        toast.error("Permission refusée pour les notifications");
      }
    }
  };

  const copyCalendarUrl = () => {
    navigator.clipboard.writeText(calendarUrl);
    toast.success("URL copiée dans le presse-papiers");
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'appointment': return 'bg-blue-500';
      default: return 'bg-primary';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Centre de Notifications
          </SheetTitle>
          <SheetDescription>
            Gérez vos notifications et intégrations calendrier
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="notifications" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notifications">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4 mt-4">
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={markAllAsRead}
                className="w-full"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Tout marquer comme lu
              </Button>
            )}

            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Aucune notification</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        notification.is_read ? 'bg-muted/30' : 'bg-accent/50'
                      }`}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${getTypeColor(notification.type)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm truncate">{notification.title}</p>
                            {!notification.is_read && (
                              <Badge variant="secondary" className="text-xs shrink-0">Nouveau</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Synchronisation Calendrier
                </CardTitle>
                <CardDescription>
                  Intégrez vos rendez-vous DONIA avec vos calendriers externes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>URL du calendrier iCal</Label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={calendarUrl}
                      readOnly
                      className="flex-1 text-xs p-2 rounded border bg-muted truncate"
                    />
                    <Button size="sm" variant="outline" onClick={copyCalendarUrl}>
                      Copier
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Ajouter à votre calendrier</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarUrl)}`, '_blank')}
                    >
                      <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="h-4 w-4 mr-2" alt="Google" />
                      Google Agenda
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => window.open(`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(calendarUrl)}`, '_blank')}
                    >
                      <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" className="h-4 w-4 mr-2" alt="Outlook" />
                      Outlook
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => window.open(calendarUrl, '_blank')}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Apple Calendar / Autres
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
                  <p>💡 L'URL iCal se synchronise automatiquement. Vos rendez-vous apparaîtront dans votre calendrier externe avec les rappels configurés.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Préférences de Notification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label>Notifications Push</Label>
                      <p className="text-xs text-muted-foreground">Notifications dans le navigateur</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={preferences.notification_push}
                      onCheckedChange={(v) => updatePreference('notification_push', v)}
                    />
                    {Notification.permission !== 'granted' && (
                      <Button size="sm" variant="outline" onClick={requestPushPermission}>
                        Activer
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label>Notifications Email</Label>
                      <p className="text-xs text-muted-foreground">Recevoir par email</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.notification_email}
                    onCheckedChange={(v) => updatePreference('notification_email', v)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label>Notifications SMS</Label>
                      <p className="text-xs text-muted-foreground">Recevoir par SMS</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.notification_sms}
                    onCheckedChange={(v) => updatePreference('notification_sms', v)}
                  />
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-700 dark:text-amber-300 mt-4">
                  <p>⚠️ Les notifications Email et SMS nécessitent la configuration de services externes (Resend, Twilio).</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}