import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe no esta configurado todavia." }, { status: 501 });
  }

  const { plan, email } = (await request.json()) as {
    plan?: "monthly" | "yearly";
    email?: string;
  };

  let customerEmail = email?.trim() ?? "";
  let userId = "";
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = getSupabaseAdmin();

  if (supabase && token) {
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (user?.email) {
      userId = user.id;
      customerEmail = user.email;
    }
  }

  if (!customerEmail) {
    return NextResponse.json({ error: "Inicia sesión o introduce un email para contratar la suscripción." }, { status: 400 });
  }

  const price =
    plan === "yearly" ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY;

  if (!price) {
    return NextResponse.json({ error: "Falta el precio de Stripe para este plan." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: customerEmail,
    line_items: [{ price, quantity: 1 }],
    success_url: `${siteUrl}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/?checkout=cancelled`,
    metadata: {
      email: customerEmail,
      plan: plan ?? "monthly",
      ...(userId ? { user_id: userId } : {}),
    },
  });

  return NextResponse.json({ url: session.url });
}
