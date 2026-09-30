"use client";

import { useState, useTransition } from "react";
import {
  adminCommitImport,
  adminPreviewImport,
} from "@/app/actions/admin-sync";

export function ImportPanel() {
  const [body, setBody] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [preview, setPreview] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
        <button
          type="button"
          className={`border px-2 py-1 ${format === "json" ? "border-cta/50 bg-cta/15" : "border-border"}`}
          onClick={() => setFormat("json")}
        >
          JSON
        </button>
        <button
          type="button"
          className={`border px-2 py-1 ${format === "csv" ? "border-cta/50 bg-cta/15" : "border-border"}`}
          onClick={() => setFormat("csv")}
        >
          CSV
        </button>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={12}
        placeholder={
          format === "json"
            ? '[{"source":"europol","sourceId":"E-1","name":"…","sourceUrl":"https://…","summary":"…"}]'
            : "source,sourceId,name,sourceUrl,summary,caseType,status\neuropol,E-1,Example,https://example.invalid,Summary,WANTED,ACTIVE"
        }
        className="w-full border border-border bg-bg px-3 py-2 font-mono text-[11px] text-text"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !body.trim()}
          className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-50"
          onClick={() =>
            start(async () => {
              const res = await adminPreviewImport(body, format);
              if (!res.ok) {
                setMessage(res.error);
                setPreview("");
                return;
              }
              setMessage("Preview ready");
              setPreview(JSON.stringify(res.data, null, 2));
            })
          }
        >
          {pending ? "Working…" : "Preview"}
        </button>
        <button
          type="button"
          disabled={pending || !body.trim()}
          className="border border-cta/50 bg-cta/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-50"
          onClick={() =>
            start(async () => {
              const res = await adminCommitImport(body, format);
              setMessage(res.ok ? (res.message ?? "Imported") : res.error);
            })
          }
        >
          Commit import
        </button>
      </div>
      {message ? (
        <p className="font-mono text-[11px] text-text-muted">{message}</p>
      ) : null}
      {preview ? (
        <pre className="max-h-80 overflow-auto border border-border bg-surface/40 p-3 font-mono text-[10px] text-text-muted">
          {preview}
        </pre>
      ) : null}
    </div>
  );
}
