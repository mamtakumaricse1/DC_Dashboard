/**
 * Contact helper utilities (URLs and message templates).
 * Contact data itself comes from GET /api/dashboard/contacts.
 */

export function whatsappUrl(phone, text) {
  const digits = String(phone || "").replace(/\D/g, "");
  const num = digits.length === 10 ? `91${digits}` : digits;
  if (!num) return null;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${num}${q}`;
}

export function buildReminderMessage(indicator) {
  const label = indicator || "RED performance indicator";
  return `Tirap TPI reminder: "${label}" is RED and needs action. Please submit/update monthly data and action plan. — DC Office`;
}

export function telUrl(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `tel:+91${digits}` : null;
}

export function mailUrl(email, subject, body) {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
