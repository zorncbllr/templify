import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
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
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const projectId = searchParams.get("projectId");
    const CDN_URL = process.env.NEXT_PUBLIC_R2_CDN_URL;

    const { Contents } = await r2.send(
      new ListObjectsV2Command({
        Bucket: "bulk-images",
        Prefix: `${userId}/${projectId}/`,
      }),
    );

    const files = (Contents ?? []).map((obj) => ({
      key: obj.Key!,
      url: `${CDN_URL}/${obj.Key}`,
      size: obj.Size ?? 0,
    }));

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error("R2 list error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
