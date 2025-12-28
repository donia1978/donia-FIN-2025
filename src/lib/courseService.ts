import { supabase } from "./supabaseClient";

export type Course = {
  id: string;
  teacher_id: string;
  title: string;
  cycle: string;
  level?: string | null;
  category?: string | null;
  lang?: string | null;
  price?: number | null;
  currency?: string | null;
  billing_model?: string | null;
  mode?: string | null;
  description?: string | null;
  status: string;
  tags?: string[] | null;
  created_at?: string;
};

export async function getMe() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function listMyCourses(): Promise<Course[]> {
  const me = await getMe();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("teacher_id", me.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function listPublishedCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function createCourse(input: Partial<Course>) {
  const me = await getMe();
  const payload = {
    teacher_id: me.id,
    title: input.title ?? "New course",
    cycle: input.cycle ?? "secondaire",
    level: input.level ?? null,
    category: input.category ?? null,
    lang: input.lang ?? "fr",
    price: input.price ?? 0,
    currency: input.currency ?? "TND",
    billing_model: input.billing_model ?? "one_time",
    mode: input.mode ?? "replay",
    description: input.description ?? null,
    status: input.status ?? "draft",
    tags: input.tags ?? [],
  };

  const { data, error } = await supabase.from("courses").insert(payload).select("*").single();
  if (error) throw error;
  return data as Course;
}

export async function publishCourse(courseId: string) {
  const { data, error } = await supabase
    .from("courses")
    .update({ status: "published" })
    .eq("id", courseId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Course;
}

export async function seedCoursesForMe() {
  const me = await getMe();
  const nowTag = new Date().toISOString().slice(0, 10);

  const seeds = [
    {
      teacher_id: me.id,
      title: "Math â€“ RÃ©vision (CollÃ¨ge) " + nowTag,
      cycle: "secondaire",
      level: "7e",
      category: "math",
      lang: "fr",
      price: 15,
      currency: "TND",
      billing_model: "one_time",
      mode: "replay",
      description: "Cours de rÃ©vision + exercices corrigÃ©s.",
      status: "published",
      tags: ["math", "revision"],
    },
    {
      teacher_id: me.id,
      title: "Physique â€“ MÃ©canique (LycÃ©e) " + nowTag,
      cycle: "secondaire",
      level: "2e",
      category: "physique",
      lang: "fr",
      price: 20,
      currency: "TND",
      billing_model: "one_time",
      mode: "hybrid",
      description: "Cours hybride (live + replay) sur la mÃ©canique.",
      status: "published",
      tags: ["physique", "mecanique"],
    },
    {
      teacher_id: me.id,
      title: "Anglais â€“ Conversation (UniversitÃ©) " + nowTag,
      cycle: "universitÃ©",
      level: "L1",
      category: "langues",
      lang: "fr",
      price: 30,
      currency: "TND",
      billing_model: "subscription",
      mode: "live",
      description: "Sessions live de conversation + supports.",
      status: "published",
      tags: ["anglais", "conversation"],
    },
  ];

  const { error } = await supabase.from("courses").insert(seeds);
  if (error) throw error;
  return true;
}