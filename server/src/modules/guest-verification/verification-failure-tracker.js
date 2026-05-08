/** @type {Map<string, number[]>} ip -> failure timestamps ms */
const failuresByIp = new Map();

function prune(tsList, windowMs) {
  const cutoff = Date.now() - windowMs;
  return tsList.filter((t) => t >= cutoff);
}

/**
 * @param {string} clientIp
 * @param {{ max: number, windowMs: number }} opts
 * @returns {boolean} true if should block
 */
export function shouldBlockVerificationAttempts(clientIp, opts) {
  const ip = String(clientIp || "unknown").trim() || "unknown";
  const max = Math.max(1, Number(opts.max) || 5);
  const windowMs = Math.max(60_000, Number(opts.windowMs) || 600_000);
  const list = prune(failuresByIp.get(ip) || [], windowMs);
  failuresByIp.set(ip, list);
  return list.length >= max;
}

/**
 * @param {string} clientIp
 */
export function recordVerificationFailure(clientIp) {
  const ip = String(clientIp || "unknown").trim() || "unknown";
  const list = failuresByIp.get(ip) || [];
  list.push(Date.now());
  failuresByIp.set(ip, list);
}

/**
 * @param {string} clientIp
 */
export function clearVerificationFailures(clientIp) {
  const ip = String(clientIp || "unknown").trim() || "unknown";
  failuresByIp.delete(ip);
}
