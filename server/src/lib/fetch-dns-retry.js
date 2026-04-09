/**
 * Node `fetch` (undici) bazen `getaddrinfo EAI_AGAIN` ile düşer; kısa backoff ile tekrar dene.
 * Kalıcı DNS/OS sorununu çözmez ama geçici çözümleyici hatalarında işe yarar.
 */
const baseFetch = globalThis.fetch.bind(globalThis);

/** Supabase / undici zincirinde geçici DNS; dışarıdan 503 eşlemesi için. */
export function isTransientDnsFailure(err) {
  let e = err;
  for (let depth = 0; depth < 8 && e; depth++) {
    const code = e.code;
    if (code === "EAI_AGAIN") return true;
    const msg = String(e.message || "");
    if (msg.includes("EAI_AGAIN") && msg.includes("getaddrinfo")) return true;
    e = e.cause;
  }
  const top = String(err?.message || "");
  if (top.includes("fetch failed") && String(err?.cause?.code || "") === "EAI_AGAIN") return true;
  return false;
}

/** PostgREST/Supabase `{ error }` nesnesi; `withSupabaseFetchGuard` dışında kalır. */
export function messageLooksLikeTransientDns(msg) {
  const s = String(msg || "");
  return (
    s.includes("EAI_AGAIN") ||
    (s.includes("fetch failed") && (s.includes("getaddrinfo") || s.includes("EAI_AGAIN"))) ||
    (s.includes("ENOTFOUND") && s.includes("supabase"))
  );
}

/**
 * @param {number} maxAttempts en az 1
 * @param {number} baseDelayMs ilk bekleme (sonraki 3x çarpan)
 */
export function createFetchWithDnsRetry(maxAttempts, baseDelayMs) {
  const n = Math.min(12, Math.max(1, Math.floor(Number(maxAttempts) || 5)));
  const base = Math.min(5000, Math.max(40, Math.floor(Number(baseDelayMs) || 120)));

  return async function fetchWithDnsRetry(input, init) {
    let lastErr;
    for (let attempt = 1; attempt <= n; attempt++) {
      try {
        return await baseFetch(input, init);
      } catch (err) {
        lastErr = err;
        if (!isTransientDnsFailure(err) || attempt === n) throw err;
        const ms = base * 3 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, ms));
      }
    }
    throw lastErr;
  };
}
