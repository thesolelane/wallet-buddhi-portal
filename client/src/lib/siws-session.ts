import bs58 from "bs58";

export async function ensureSiwsSession(params: {
  address: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<void> {
  const me = await fetch("/api/auth/me", { credentials: "include" });
  if (me.ok) {
    const data = await me.json();
    if (data?.address === params.address) return;
  }

  const challengeRes = await fetch("/api/auth/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: params.address }),
  });
  if (!challengeRes.ok) {
    const err = await challengeRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to start sign-in");
  }
  const challenge = await challengeRes.json();
  const messageBytes = new TextEncoder().encode(challenge.message);
  const signatureBytes = await params.signMessage(messageBytes);
  const signature = bs58.encode(signatureBytes);

  const verifyRes = await fetch("/api/auth/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: params.address,
      nonce: challenge.nonce,
      signature,
      message: challenge.message,
    }),
  });
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.error || "Signature verification failed");
  }
}
