import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectEditor from "./ProjectEditor";

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, plan, storage_used")
    .eq("id", user.id)
    .single();

  // Generate signed URL for data file if it exists
  let dataFileUrl: string | null = null;
  if (project.data_file_path) {
    const { data: signedData } = await supabase.storage
      .from("data-files")
      .createSignedUrl(project.data_file_path, 3600); // 1 hour
    dataFileUrl = signedData?.signedUrl ?? null;
  }

  const displayName = profile?.full_name || user.email || "User";

  return (
    <ProjectEditor
      project={{
        id: project.id,
        objects: project.objects ?? [],
        canvas_width: project.canvas_width,
        canvas_height: project.canvas_height,
        columns: project.columns ?? [],
        data_images_label: project.data_images_label,
        data_file_url: dataFileUrl,
        data_file_path: project.data_file_path,
        name: project.name,
      }}
      userPlan={profile?.plan ?? "free"}
      userId={user.id}
      displayName={displayName}
      storageUsed={profile?.storage_used ?? 0}
    />
  );
}
