export function buildSnakePickSlots(members) {
  const eligible = members.filter(
    (member) => member.status === "active" && member.gamesAllowed > 0
  );

  if (eligible.length === 0) return [];

  const maximumRounds = Math.max(
    ...eligible.map((member) => member.gamesAllowed)
  );
  const slots = [];

  for (let round = 1; round <= maximumRounds; round += 1) {
    const order = round % 2 === 1 ? eligible : [...eligible].reverse();

    order.forEach((member) => {
      if (member.gamesAllowed >= round) {
        slots.push({
          memberId: member.id,
          round,
          overallPick: slots.length + 1,
        });
      }
    });
  }

  return slots;
}

export function getNextEligibleSlot(slots, completedPicks) {
  const completedKeys = new Set(
    completedPicks.map((pick) => `${pick.round}:${pick.memberId}`)
  );

  return (
    slots.find(
      (slot) => !completedKeys.has(`${slot.round}:${slot.memberId}`)
    ) || null
  );
}

export function canMemberPick({
  memberId,
  currentMemberId,
  gamesAllowed,
  gamesDrafted,
  gameAvailable,
  draftStarted,
  draftPaused,
}) {
  return Boolean(
    memberId &&
      memberId === currentMemberId &&
      gamesDrafted < gamesAllowed &&
      gameAvailable &&
      draftStarted &&
      !draftPaused
  );
}

export function getRemainingSeconds(deadline, now = Date.now()) {
  if (!deadline) return null;
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
}

export function isTurnOpen(run, now = Date.now()) {
  return Boolean(
    run?.status === "live" &&
    run?.turn_deadline_at &&
    new Date(run.turn_deadline_at).getTime() > now
  );
}

export function getDraftCompletionKey(run) {
  return run?.id && run?.completed_at
    ? `lakers-draft-complete-${run.id}-${run.completed_at}`
    : null;
}

export function getAllowanceSummary(members, games) {
  const assigned = members
    .filter((member) => member.status === "active")
    .reduce((total, member) => total + Number(member.gamesAllowed || 0), 0);
  const draftable = games.filter((game) => game.status === "draft").length;
  return { assigned, draftable, difference: assigned - draftable, valid: assigned === draftable };
}

export function getGameTimeMinutes(value) {
  if (!value) return null;
  const twelveHour = String(value).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]) % 12;
    if (twelveHour[3].toUpperCase() === "PM") hour += 12;
    return hour * 60 + Number(twelveHour[2]);
  }
  const twentyFourHour = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  return twentyFourHour ? Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]) : null;
}

export function filterDraftBoardGames(games, filters) {
  const opponent = filters.opponent?.trim().toLowerCase();
  return games.filter((game) => {
    const date = game.date || game.game_date;
    const monthMatches = !filters.month || date?.slice(5, 7) === filters.month;
    const dateMatches = !filters.date || date === filters.date;
    const weekday = date ? new Date(`${date}T12:00:00`).getDay().toString() : "";
    const dayMatches = !filters.day || weekday === filters.day;
    const opponentMatches = !opponent || game.opponent.toLowerCase().includes(opponent);
    const gameMinutes = getGameTimeMinutes(game.time || game.game_time);
    const minimumMinutes = getGameTimeMinutes(filters.minimumTime);
    const timeMatches = minimumMinutes == null || (gameMinutes != null && gameMinutes >= minimumMinutes);
    return opponentMatches && monthMatches && dateMatches && dayMatches && timeMatches;
  });
}

export function calculateMemberAmountDue(packageCost, totalPackageGames, gamesDrafted) {
  const total = Number(packageCost);
  const games = Number(totalPackageGames);
  const drafted = Number(gamesDrafted);
  if (!Number.isFinite(total) || !Number.isFinite(games) || games <= 0 || !Number.isFinite(drafted)) return 0;
  return (total / games) * drafted;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}
