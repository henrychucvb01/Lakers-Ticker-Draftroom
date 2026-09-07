export function normalizeMemberPin(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 4);
}

export function isValidMemberPin(value) {
  return /^\d{4}$/.test(value);
}

export function preserveSelectedMemberId(members, currentMemberId) {
  if (members.some((member) => member.member_id === currentMemberId)) return currentMemberId;
  return members[0]?.member_id || "";
}
