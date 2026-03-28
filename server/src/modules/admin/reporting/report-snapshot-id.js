import crypto from "crypto";

/**
 * PDF’te kullanılan analitik paketinin deterministik özeti.
 * Aynı içerik → aynı kimlik (yeniden indirmede tutarlılık ve önbellek için).
 */
function stableStringify(value) {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "number" || t === "boolean") return JSON.stringify(value);
  if (t === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((x) => stableStringify(x)).join(",")}]`;
  }
  if (t === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

/**
 * @param {object} analyticsPayload buildAnalyticsPayload çıktısı
 * @returns {string} hex kimlik (20 karakter)
 */
export function computeReportSnapshotId(analyticsPayload) {
  const clone = JSON.parse(JSON.stringify(analyticsPayload || {}));
  if (clone.meta && typeof clone.meta === "object") {
    delete clone.meta.generated_at;
    delete clone.meta.report_snapshot_id;
  }
  const body = stableStringify(clone);
  return crypto.createHash("sha256").update(body, "utf8").digest("hex").slice(0, 20);
}
