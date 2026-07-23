"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Upload } from "lucide-react";
import { saveDocument } from "@/app/actions/documents";
import type { DocumentCategory } from "@/app/generated/prisma/client";

const CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = [
  { value: "CARE_PLAN", label: "Care Plan" },
  { value: "CNA", label: "CNA" },
  { value: "HRA", label: "HRA" },
  { value: "TOC", label: "TOC" },
  { value: "SIGNATURE", label: "Signature Page" },
  { value: "SCREENING", label: "Screening" },
  { value: "OTHER", label: "Other" },
];

export function DocumentUpload({ memberId }: { memberId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<DocumentCategory>("OTHER");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/documents/upload",
        clientPayload: JSON.stringify({ memberId }),
      });

      await saveDocument(memberId, { name: file.name, category, url: blob.url });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="mb-4 space-y-2 border-b border-stone-100 pb-4 print:hidden">
      <div className="flex items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          disabled={isUploading}
          className="rounded-md border border-stone-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-500 hover:border-fuchsia-400 hover:text-fuchsia-600">
          <Upload className="h-3.5 w-3.5" />
          {isUploading ? "Uploading…" : "Upload PDF"}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
