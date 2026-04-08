import { resolveOperationalGroupForRecordType } from "./whatsapp-group-registry.service.js";
import { sendMessageToWhatsappGroup } from "./whatsapp-group-bot.service.js";
import { formatOperationalGroupMessageText } from "./operational-group-message-format.js";

export async function sendOperationalWhatsappGroupNotification({
  recordType,
  payload,
  bodyParams: _unusedBodyParams,
  dedupeKey,
}) {
  const target = resolveOperationalGroupForRecordType(recordType);
  if (!target?.id) {
    return { ok: false, skipped: true, reason: "group_not_configured" };
  }
  const text = formatOperationalGroupMessageText(recordType, payload);
  const sent = await sendMessageToWhatsappGroup({
    groupId: target.id,
    text,
    dedupeKey,
  });
  return {
    ok: true,
    duplicate: Boolean(sent.duplicate),
    channel: "group",
    groupKey: target.key,
    groupId: target.id,
    messageId: sent.messageId || "",
  };
}
