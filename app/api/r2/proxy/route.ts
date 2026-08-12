import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { R2_BUCKET, getR2Client, sanitizeObjectKey } from "@/lib/storage/r2";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || !sanitizeObjectKey(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    const { Body, ContentType } = await getR2Client().send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    );

    if (!Body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(Body.transformToWebStream() as ReadableStream, {
      headers: {
        "Content-Type": ContentType ?? "image/jpeg",
        "Cache-Control":
          "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    if (error?.name === "NoSuchKey") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("R2 proxy error:", error);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}
