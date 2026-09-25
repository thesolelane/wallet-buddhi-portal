const KEY = "wb.vid";

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getGuestId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(KEY) || "";
    if (!/^[a-f0-9]{32}$/i.test(id)) {
      id = randomId();
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function guestHeaders(): Record<string, string> {
  const id = getGuestId();
  return id ? { "x-wb-vid": id } : {};
}
