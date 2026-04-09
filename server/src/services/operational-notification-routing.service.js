/** Kayıt türü → operasyon hattı (teknik / HK / ön büro). WhatsApp sohbet grubu yok; Cloud API numara listeleri. */
const OPERATIONAL_TEAM_BY_RECORD_TYPE = {
  fault: "teknik",
  request: "hk",
  complaint: "on_buro",
  guest_notification: "on_buro",
  late_checkout: "on_buro",
};

export function resolveOperationalTeamKey(recordType = "") {
  const key = String(recordType || "").trim().toLowerCase();
  return OPERATIONAL_TEAM_BY_RECORD_TYPE[key] || "";
}

/** @deprecated Eski ad; `resolveOperationalTeamKey` kullanın. */
export function resolveOperationalGroupKey(recordType = "") {
  return resolveOperationalTeamKey(recordType);
}

export function isOperationalRecordType(recordType = "") {
  return Boolean(resolveOperationalTeamKey(recordType));
}
