import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, user } = await getUserFromRequest(request);

  if (!supabase || !user) {
    return NextResponse.json({ error: "Inicia sesión para abrir conversaciones." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, messages, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No pude abrir esta conversacion." }, { status: 404 });
  }

  return NextResponse.json({ conversation: data });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, user } = await getUserFromRequest(request);

  if (!supabase || !user) {
    return NextResponse.json({ error: "Inicia sesión para guardar conversaciones." }, { status: 401 });
  }

  const { title, messages } = (await request.json()) as {
    title?: string;
    messages?: unknown;
  };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (title?.trim()) {
    updates.title = title.trim();
  }

  if (Array.isArray(messages)) {
    updates.messages = messages;
  }

  const { data, error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, title, messages, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No pude guardar esta conversacion." }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, user } = await getUserFromRequest(request);

  if (!supabase || !user) {
    return NextResponse.json({ error: "Inicia sesión para borrar conversaciones." }, { status: 401 });
  }

  const { error } = await supabase.from("conversations").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "No pude borrar esta conversacion." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
