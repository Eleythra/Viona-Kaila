const OPERATIONAL_GROUP_BY_RECORD_TYPE = {
  fault: "teknik",
  request: "hk",
  complaint: "on_buro",
  guest_notification: "on_buro",
  late_checkout: "on_buro",
};

export function resolveOperationalGroupKey(recordType = "") {
  const key = String(recordType || "").trim().toLowerCase();
  return OPERATIONAL_GROUP_BY_RECORD_TYPE[key] || "";
}

export function isOperationalRecordType(recordType = "") {
  return Boolean(resolveOperationalGroupKey(recordType));
}
