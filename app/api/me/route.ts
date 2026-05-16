import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({
      configured: false,
      subscriptionStatus: "demo",
      hasAccess: true,
    });
  }

  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ configured: true, hasAccess: false }, { status: 401 });
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ configured: true, hasAccess: false }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const subscriptionStatus = profile?.subscription_status ?? "inactive";

  return NextResponse.json({
    configured: true,
    email: user.email,
    subscriptionStatus,
    hasAccess: subscriptionStatus === "active" || subscriptionStatus === "trialing",
  });
}
