import {
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import {
  R2_BUCKET,
  getR2Client,
  requireAuthUserId,
  isValidProjectId,
} from "@/lib/storage/r2";

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireAuthUserId();
    let bodyUserId: string | null = null;
    let projectId = "";
    try {
      const body = await req.json();
      bodyUserId = body.userId ?? null;
      projectId = body.projectId ?? "";
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    if (bodyUserId && bodyUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isValidProjectId(projectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    const r2 = getR2Client();
    const folder = `${userId}/${projectId}/`;

    const { Contents } = await r2.send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: folder }),
    );

    if (!Contents?.length) return NextResponse.json({ bytesFreed: 0 });

    const bytesFreed = Contents.reduce((acc, obj) => acc + (obj.Size ?? 0), 0);

    await r2.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: {
          Objects: Contents.map((obj) => ({ Key: obj.Key! })),
        },
      }),
    );

    return NextResponse.json({ bytesFreed });
  } catch (error: any) {
    console.error("R2 delete error:", error);
    const unauthorized = error?.message === "Unauthorized";
    return NextResponse.json(
      { error: unauthorized ? "Unauthorized" : "Delete failed" },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
