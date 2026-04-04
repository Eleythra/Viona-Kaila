/**
 * @deprecated Doğrudan `services/whatsapp-operational-notification.service.js` kullanın.
 * Geriye dönük import yolları için re-export.
 */
export {
  sendOperationalWhatsappNotification,
  sendWhatsappOperationalNotification,
  parseOperationalRecipients,
  parseWhatsappRecipientList,
  recipientsForGuestPayload,
} from "../services/whatsapp-operational-notification.service.js";
