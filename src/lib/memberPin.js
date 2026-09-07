export function normalizeMemberPin(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 4);
}

export function isValidMemberPin(value) {
  return /^\d{4}$/.test(value);
}
