import { supabase } from "./supabaseClient";

export type InfoCategory = "culture" | "sport" | "politics";

export type InfoItem = {
  id: string;
  category: InfoCategory;
  country: string;
  title: string;
  summary?: string | null;
  event_date?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  currency?: string | null;
  location?: string | null;
  tags?: string[] | null;
  media_type?: "image" | "video" | "none" | null;
  media_url?: string | null;
  media_thumb_url?: string | null;

  source_name: string;
  source_url: string;
  license_name: string;
  license_url: string;
  attribution_text: string;

  status: "draft" | "published" | "archived";
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function listInfo(category: InfoCategory, country?: string) {
  let q = supabase
    .from("info_items")
    .select("*")
    .eq("category", category)
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (country) q = q.eq("country", country);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as InfoItem[];
}