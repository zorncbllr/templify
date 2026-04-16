import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

export async function DELETE(req: NextRequest) {
  try {
    const { userId, projectId } = await req.json();
    const folder = `${userId}/${projectId}/`;

    const { Contents } = await r2.send(
      new ListObjectsV2Command({
        Bucket: "bulk-images",
        Prefix: folder,
      }),
    );

    if (!Contents?.length) return NextResponse.json({ bytesFreed: 0 });

    const bytesFreed = Contents.reduce((acc, obj) => acc + (obj.Size ?? 0), 0);

    await r2.send(
      new DeleteObjectsCommand({
        Bucket: "bulk-images",
        Delete: {
          Objects: Contents.map((obj) => ({ Key: obj.Key! })),
        },
      }),
    );

    return NextResponse.json({ bytesFreed });
  } catch (error: any) {
    console.error("R2 delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
