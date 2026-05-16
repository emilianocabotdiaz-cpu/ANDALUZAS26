import { NextResponse } from "next/server";
import { getLatestMediaNews } from "@/lib/official-news";

export const revalidate = 3600;

export async function GET() {
  const media = await getLatestMediaNews();

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    media,
  });
}
