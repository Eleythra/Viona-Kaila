import { getConfiguredGroupExpectations } from "./whatsapp-group-registry.service.js";
import { listWhatsappGroups } from "./whatsapp-group-bot.service.js";

export async function discoverWhatsappGroups() {
  const groups = await listWhatsappGroups();
  return groups;
}

export async function verifyConfiguredWhatsappGroups() {
  const expected = getConfiguredGroupExpectations();
  const discovered = await listWhatsappGroups();
  const byId = new Map(discovered.map((g) => [g.id, g]));

  const checks = Object.entries(expected).map(([key, cfg]) => {
    const id = String(cfg?.id || "").trim();
    if (!id) return { key, ok: false, reason: "missing_configured_group_id", configuredName: cfg?.name || "" };
    const hit = byId.get(id);
    if (!hit) return { key, ok: false, reason: "configured_group_id_not_found", configuredName: cfg?.name || "" };
    const expectedName = String(cfg?.name || "").trim();
    const nameMatches = expectedName ? expectedName === String(hit.name || "").trim() : true;
    return {
      key,
      ok: nameMatches,
      reason: nameMatches ? "ok" : "name_mismatch",
      configuredName: expectedName,
      actualName: hit.name,
      id,
    };
  });

  return {
    allOk: checks.every((c) => c.ok),
    checks,
    discoveredCount: discovered.length,
  };
}
