"use client";

import { useState } from "react";

/**
 * Typed in-session only, not persisted — the report itself is read-only
 * derived data (attendance/assessment/behaviour), so there's nowhere to
 * save a draft comment without a new model. Good enough for "type it, then
 * print" in one sitting; a saved/reusable comment is a natural fast-follow.
 */
export function TeacherComment() {
  const [comment, setComment] = useState("");
  return (
    <textarea
      value={comment}
      onChange={(e) => setComment(e.target.value)}
      placeholder="Type a comment before printing…"
      rows={5}
      className="mt-3 w-full resize-none rounded-lg border border-slate-300 p-3 text-sm print:border-slate-400 print:placeholder:text-transparent"
    />
  );
}
