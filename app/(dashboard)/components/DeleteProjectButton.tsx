"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteProjectDataImages } from "@/lib/storage/data-images";
import { IconTrash, IconWarning } from "@/components/Icons";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName?: string;
  userId: string;
}

export default function DeleteProjectButton({
  projectId,
  projectName,
  userId,
}: DeleteProjectButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const supabase = createClient();

      // Reclaim R2 storage for this project's data images, then decrement
      // the profile's storage_used by the freed amount.
      const bytesFreed = await deleteProjectDataImages(userId, projectId);
      if (bytesFreed > 0) {
        await supabase.rpc("update_storage_used", { delta: -bytesFreed });
      }

      // Delete the project row (data_rows jsonb is removed with it)
      await supabase.from("projects").delete().eq("id", projectId);
      window.location.reload();
    } catch (err) {
      console.error("Project delete failed:", err);
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Delete project"
        className="flex items-center justify-center bg-transparent border-none cursor-pointer p-1.5 rounded-md shrink-0 transition-colors"
        style={{
          color: hovered ? "rgba(220,60,60,0.8)" : "rgba(240,237,232,0.3)",
        }}
      >
        <IconTrash size={14} color="currentColor" />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-app-bg border border-white/[0.07] rounded-2xl shadow-2xl w-[400px] max-w-[90vw] p-6 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <IconWarning size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-app-text m-0">
                  Delete Project
                </h3>
                <p className="text-[12px] text-app-text/40 m-0 mt-0.5">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Body */}
            <p className="text-[13px] text-app-text/60 m-0 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-app-text/80">
                {projectName || "this project"}
              </span>
              ? All data, images, and exports associated with it will be
              permanently removed.
            </p>

            {/* Actions */}
            <div className="flex gap-2.5 justify-end pt-1">
              <button
                onClick={() => setShowModal(false)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg text-[12px] font-semibold cursor-pointer bg-transparent border border-white/[0.08] text-app-text/50 hover:bg-white/[0.04] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg text-[12px] font-bold cursor-pointer bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
