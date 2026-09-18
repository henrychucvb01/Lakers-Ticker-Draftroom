const commissionerPages = new Set(["games", "members", "commissioner"]);

export function canAccessPage(page, isCommissioner) {
  return isCommissioner || !commissionerPages.has(page);
}

export function resolvePermittedPage(page, isCommissioner) {
  return canAccessPage(page, isCommissioner) ? page : "draft";
}

export function didAuthenticatedUserChange(currentUserId, nextUserId) {
  return (currentUserId || null) !== (nextUserId || null);
}

export function canRevealDraftOrder(isCommissioner, run) {
  return Boolean(isCommissioner && run?.order_generated_at && !run?.reveal_started_at);
}
