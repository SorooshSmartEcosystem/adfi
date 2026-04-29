"use client";
import { useEffect, useRef, useState } from "react";
import { Card } from "../shared/card";
import { trpc } from "../../lib/trpc";

type Mode = "view" | "edit";

export function BusinessProfileCard() {
  const businessQuery = trpc.business.getActive.useQuery();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<Mode>("view");
  const update = trpc.business.updateActive.useMutation({
    onSuccess: () => {
      utils.business.getActive.invalidate();
      utils.business.list.invalidate();
      setMode("view");
    },
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!businessQuery.data) return;
    setName(businessQuery.data.name ?? "");
    setDescription(businessQuery.data.description ?? "");
    setWebsite(businessQuery.data.websiteUrl ?? "");
    setLogoUrl(businessQuery.data.logoUrl ?? null);
  }, [businessQuery.data]);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `upload failed (${res.status})`);
      }
      const { url } = (await res.json()) as { url: string };
      setLogoUrl(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    update.mutate({
      name: name.trim() || undefined,
      description: description.trim() ? description.trim() : null,
      websiteUrl: website.trim() ? website.trim() : null,
      logoUrl,
    });
  }

  if (businessQuery.isLoading) {
    return (
      <Card>
        <p className="font-mono text-sm text-ink3">one second</p>
      </Card>
    );
  }

  if (mode === "view") {
    return (
      <Card>
        <div className="flex items-start gap-md">
          <div className="w-[64px] h-[64px] rounded-md bg-surface flex items-center justify-center overflow-hidden shrink-0 border-hairline border-border">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="font-mono text-[10px] text-ink4 tracking-[0.15em]">
                NO LOGO
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-medium mb-xs truncate">
              {name || "(no business name yet)"}
            </div>
            <p className="text-sm text-ink3 leading-relaxed mb-sm">
              {description || "(no description — agents are guessing)"}
            </p>
            {website ? (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-ink2 underline hover:text-ink"
              >
                {website.replace(/^https?:\/\//, "")} ↗
              </a>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors shrink-0"
          >
            edit
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start gap-md mb-md">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="relative w-[64px] h-[64px] rounded-md bg-surface flex items-center justify-center overflow-hidden shrink-0 border-hairline border-border hover:border-ink transition-colors disabled:opacity-40"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="logo"
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="font-mono text-[10px] text-ink4 tracking-[0.15em] text-center px-xs">
              {uploading ? "UPLOADING" : "ADD LOGO"}
            </span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="flex-1 min-w-0 flex flex-col gap-xs">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="font-mono text-xs text-ink2 underline hover:text-ink text-left disabled:opacity-40"
          >
            {logoUrl ? "replace logo" : "upload logo"}
          </button>
          {logoUrl ? (
            <button
              type="button"
              onClick={() => setLogoUrl(null)}
              className="font-mono text-xs text-ink4 hover:text-urgent text-left"
            >
              remove
            </button>
          ) : null}
          <p className="font-mono text-[10px] text-ink4 mt-xs">
            png · jpg · webp · svg · max 2mb
          </p>
        </div>
      </div>

      {uploadError ? (
        <p className="text-sm text-urgent font-mono mb-md">{uploadError}</p>
      ) : null}

      <div className="flex flex-col gap-md">
        <div>
          <label className="font-mono text-[10px] text-ink4 tracking-[0.15em] mb-xs block">
            BUSINESS NAME
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ceramics co."
            className="w-full px-md py-[10px] bg-bg border-hairline border-border rounded-md text-sm focus:outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] text-ink4 tracking-[0.15em] mb-xs block">
            WHAT YOU DO
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="i run a small-batch ceramics studio in toronto — handmade tableware and weekly classes."
            className="w-full px-md py-[10px] bg-bg border-hairline border-border rounded-md text-sm focus:outline-none focus:border-ink resize-none"
          />
          <p className="font-mono text-[10px] text-ink4 mt-xs">
            {description.length} / 500
          </p>
        </div>
        <div>
          <label className="font-mono text-[10px] text-ink4 tracking-[0.15em] mb-xs block">
            WEBSITE (OPTIONAL)
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://ceramicsco.ca"
            className="w-full px-md py-[10px] bg-bg border-hairline border-border rounded-md text-sm focus:outline-none focus:border-ink"
          />
        </div>
      </div>

      {update.error ? (
        <p className="text-sm text-urgent font-mono mt-md">
          {update.error.message}
        </p>
      ) : null}

      <div className="flex items-center gap-sm mt-lg">
        <button
          type="button"
          onClick={handleSave}
          disabled={update.isPending || uploading}
          className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full disabled:opacity-40"
        >
          {update.isPending ? "saving..." : "save changes"}
        </button>
        <button
          type="button"
          onClick={() => setMode("view")}
          className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors"
        >
          cancel
        </button>
      </div>
    </Card>
  );
}
