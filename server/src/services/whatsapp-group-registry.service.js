import { resolveOperationalGroupKey } from "./operational-notification-routing.service.js";

function clean(value = "") {
  return String(value || "").trim();
}

function resolveGroupConfig() {
  return {
    teknik: {
      id: clean(process.env.WHATSAPP_GROUP_ID_TEKNIK),
      name: clean(process.env.WHATSAPP_GROUP_NAME_TEKNIK),
    },
    hk: {
      id: clean(process.env.WHATSAPP_GROUP_ID_HK),
      name: clean(process.env.WHATSAPP_GROUP_NAME_HK),
    },
    on_buro: {
      id: clean(process.env.WHATSAPP_GROUP_ID_ON_BURO),
      name: clean(process.env.WHATSAPP_GROUP_NAME_ON_BURO),
    },
  };
}

export function resolveOperationalGroupForRecordType(recordType = "") {
  const key = resolveOperationalGroupKey(recordType);
  const groups = resolveGroupConfig();
  if (!key || !groups[key]?.id) return null;
  return { key, id: groups[key].id, name: groups[key].name || key };
}

export function getWhatsappGroupRegistryHealth() {
  const groups = resolveGroupConfig();
  return {
    teknikConfigured: Boolean(groups.teknik.id),
    hkConfigured: Boolean(groups.hk.id),
    onBuroConfigured: Boolean(groups.on_buro.id),
    allOperationalGroupsConfigured: Boolean(groups.teknik.id && groups.hk.id && groups.on_buro.id),
  };
}

export function getConfiguredGroupExpectations() {
  return resolveGroupConfig();
}
