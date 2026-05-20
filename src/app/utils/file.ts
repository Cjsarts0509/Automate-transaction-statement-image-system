export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function mimeToExt(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  const m = mime.match(/^image\/([a-z0-9]+)/i);
  return m ? m[1].toLowerCase() : "png";
}

export function makeClipboardFileName(ext: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `clipboard-${stamp}.${ext}`;
}

export function blobToFile(blob: Blob, name?: string): File {
  const ext = mimeToExt(blob.type || "image/png");
  return new File([blob], name || makeClipboardFileName(ext), {
    type: blob.type || "image/png",
  });
}

export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function toDateInputValue(v: string): string {
  if (v.length === 8) {
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  }
  return "";
}

export function fromDateInputValue(v: string): string {
  return v.replace(/-/g, "");
}
