import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function getUserFromRequest(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!supabase || !token) {
    return { supabase, user: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  return { supabase, user };
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getUserFromRequest(request);

  if (!supabase || !user) {
    return NextResponse.json({ conversations: [] });
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({ error: "No pude cargar el historial." }, { status: 500 });
  }

  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getUserFromRequest(request);

  if (!supabase || !user) {
    return NextResponse.json({ error: "Inicia sesión para crear conversaciones." }, { status: 401 });
  }

  const { title, messages } = (await request.json()) as {
    title?: string;
    messages?: unknown;
  };

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      title: title?.trim() || "Nuevo chat",
      messages: Array.isArray(messages) ? messages : [],
    })
    .select("id, title, updated_at, messages")
    .single();

  if (error) {
    return NextResponse.json({ error: "No pude crear la conversacion." }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}
