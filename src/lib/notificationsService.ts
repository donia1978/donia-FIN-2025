import { supabase } from "./supabaseClient";

export type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  body?: string | null;
  module?: string | null;
  level?: "info" | "success" | "warning" | "danger";
  is_read: boolean;
  action_url?: string | null;
  created_at: string;
};

export async function listMyNotifications() {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user;
  if (!me) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as NotificationItem[];
}