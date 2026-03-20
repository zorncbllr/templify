export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return new NextResponse(
    "Stripe webhook endpoint removed. Use PayMongo only.",
    { status: 410 },
  );
}
