const KEY = "wb.vid";
const VID_RE = /^[a-f0-9]{32}$/i;

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function readDocumentCookie(name: string) {
  if (typeof document === "undefined") return "";
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return "";
}

function writeDocumentCookie(id: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${KEY}=${id}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function getGuestId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(KEY) || "";
    if (!VID_RE.test(id)) {
      const fromCookie = readDocumentCookie(KEY);
      id = VID_RE.test(fromCookie) ? fromCookie : randomId();
      window.localStorage.setItem(KEY, id);
    }
    writeDocumentCookie(id);
    return id.toLowerCase();
  } catch {
    const fromCookie = readDocumentCookie(KEY);
    if (VID_RE.test(fromCookie)) return fromCookie.toLowerCase();
    return "";
  }
}

export function guestHeaders(): Record<string, string> {
  const id = getGuestId();
  return id ? { "x-wb-vid": id } : {};
}
