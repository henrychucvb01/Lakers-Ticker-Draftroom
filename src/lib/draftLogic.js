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

