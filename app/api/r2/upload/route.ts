import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/lib/config/pricing";
import {
  R2_BUCKET,
  MAX_FILE_BYTES,
  getR2Client,
  r2CdnUrl,
  requireAuthUserId,
  isValidProjectId,
  sanitizeFileName,
} from "@/lib/storage/r2";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuthUserId();
    const formData = await req.formData();
    const projectId = (formData.get("projectId") as string) ?? "";
    const bodyUserId = formData.get("userId") as string | null;
    const files = formData.getAll("files") as File[];

    if (bodyUserId && bodyUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isValidProjectId(projectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }
    if (!files.length) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    let bytesUploaded = 0;
    for (const file of files) {
      if (!sanitizeFileName(file.name)) {
        return NextResponse.json(
          { error: `Invalid file name: ${file.name}` },
          { status: 400 },
        );
      }
      if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          {
            error: `File too large: ${file.name} (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB)`,
          },
          { status: 413 },
        );
      }
      if (
        !file.type.startsWith("image/") &&
        !/\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(file.name)
      ) {
        return NextResponse.json(
          { error: `Not an image: ${file.name}` },
          { status: 400 },
        );
      }
      bytesUploaded += file.size;
    }

    // Server-side storage cap enforcement (client checks are cosmetic)
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, storage_used")
      .eq("id", userId)
      .single();
    if (profile) {
      const limit = getPlanLimits(profile.plan ?? "free").storageBytes;
      if (bytesUploaded > limit) {
        return NextResponse.json(
          { error: "Storage limit exceeded" },
          { status: 413 },
        );
      }
    }

    const r2 = getR2Client();
    const results: Record<string, string> = {};

    for (const file of files) {
      const path = `${userId}/${projectId}/${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: path,
          Body: buffer,
          ContentType: file.type || "image/jpeg",
        }),
      );
      results[file.name] = `${r2CdnUrl()}/${path}`;
    }

    return NextResponse.json({ results, bytesUploaded });
  } catch (error: any) {
    console.error("R2 upload error:", error);
    const unauthorized = error?.message === "Unauthorized";
    return NextResponse.json(
      { error: unauthorized ? "Unauthorized" : "Upload failed" },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
