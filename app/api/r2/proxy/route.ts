import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  try {
    const { Body, ContentType } = await r2.send(
      new GetObjectCommand({ Bucket: "bulk-images", Key: key }),
    );

    if (!Body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const bytes = await Body.transformToByteArray();
    return new NextResponse(bytes.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": ContentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error("R2 proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
