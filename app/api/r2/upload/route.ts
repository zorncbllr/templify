import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = formData.get("userId") as string;
    const projectId = formData.get("projectId") as string;
    const files = formData.getAll("files") as File[];

    const CDN_URL = process.env.NEXT_PUBLIC_R2_CDN_URL;
    const results: Record<string, string> = {};
    let bytesUploaded = 0;

    await Promise.all(
      files.map(async (file) => {
        const path = `${userId}/${projectId}/${file.name}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await r2.send(
          new PutObjectCommand({
            Bucket: "bulk-images",
            Key: path,
            Body: buffer,
            ContentType: file.type || "image/jpeg",
          }),
        );
        bytesUploaded += file.size;
        results[file.name] = `${CDN_URL}/${path}`;
      }),
    );

    return NextResponse.json({ results, bytesUploaded });
  } catch (error: any) {
    console.error("R2 upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
