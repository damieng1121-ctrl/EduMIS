"use client";

import { useRef, useState } from "react";
import { User as UserIcon } from "lucide-react";

export function PupilPhoto({ pupilId, hasPhoto }: { pupilId: string; hasPhoto: boolean }) {
  const [nonce, setNonce] = useState(0);
  const [photoSet, setPhotoSet] = useState(hasPhoto);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/pupils/${pupilId}/photo`, { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn't upload that photo.");
        return;
      }
      setPhotoSet(true);
      setNonce((n) => n + 1);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function remove() {
    if (!window.confirm("Remove this pupil's photo?")) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pupils/${pupilId}/photo`, { method: "DELETE" });
      if (!res.ok) {
        setError("Couldn't remove the photo.");
        return;
      }
      setPhotoSet(false);
      setNonce((n) => n + 1);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
        {photoSet ? (
          // eslint-disable-next-line @next/next/no-img-element -- small per-pupil photo, not worth next/image's remote-loader setup
          <img key={nonce} src={`/api/pupils/${pupilId}/photo?v=${nonce}`} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserIcon size={24} className="text-slate-400 dark:text-slate-500" />
        )}
      </div>
      <div className="flex gap-2 text-xs">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-400"
        >
          {uploading ? "…" : photoSet ? "Change" : "Add photo"}
        </button>
        {photoSet && (
          <button onClick={remove} disabled={uploading} className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400">
            Remove
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
      {error && <p className="max-w-[8rem] text-center text-[10px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
