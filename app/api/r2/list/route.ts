import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import {
  R2_BUCKET,
  getR2Client,
  r2CdnUrl,
  requireAuthUserId,
  isValidProjectId,
} from "@/lib/storage/r2";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuthUserId();
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get("userId");
    const projectId = searchParams.get("projectId") ?? "";

    if (queryUserId && queryUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isValidProjectId(projectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    const { Contents } = await getR2Client().send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: `${userId}/${projectId}/`,
      }),
    );

    const files = (Contents ?? []).map((obj) => ({
      key: obj.Key!,
      url: `${r2CdnUrl()}/${obj.Key}`,
      size: obj.Size ?? 0,
    }));

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error("R2 list error:", error);
    const unauthorized = error?.message === "Unauthorized";
    return NextResponse.json(
      { error: unauthorized ? "Unauthorized" : "List failed" },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
