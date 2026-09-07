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
