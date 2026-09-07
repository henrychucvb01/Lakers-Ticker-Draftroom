import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSnakePickSlots,
  canMemberPick,
  calculateMemberAmountDue,
  filterDraftBoardGames,
  getGameTimeMinutes,
  getDraftCompletionKey,
  getAllowanceSummary,
  getNextEligibleSlot,
  getRemainingSeconds,
  isTurnOpen,
} from "../src/lib/draftLogic.js";

const members = [
  { id: "jason", status: "active", gamesAllowed: 3 },
  { id: "huy", status: "active", gamesAllowed: 2 },
  { id: "courtney", status: "active", gamesAllowed: 1 },
  { id: "inactive", status: "inactive", gamesAllowed: 10 },
];

test("builds a snake order and skips members after their allowance", () => {
  assert.deepEqual(buildSnakePickSlots(members), [
    { memberId: "jason", round: 1, overallPick: 1 },
    { memberId: "huy", round: 1, overallPick: 2 },
    { memberId: "courtney", round: 1, overallPick: 3 },
    { memberId: "huy", round: 2, overallPick: 4 },
    { memberId: "jason", round: 2, overallPick: 5 },
    { memberId: "jason", round: 3, overallPick: 6 },
  ]);
});

test("calculates member payment from package cost and real drafted games", () => {
  assert.equal(calculateMemberAmountDue(4200, 21, 5), 1000);
  assert.equal(calculateMemberAmountDue(4200, 0, 5), 0);
});

test("calculates a backend deadline countdown without resetting it", () => {
  assert.equal(getRemainingSeconds("2026-09-06T12:01:30.000Z", Date.parse("2026-09-06T12:01:00.000Z")), 30);
  assert.equal(getRemainingSeconds("2026-09-06T12:00:30.000Z", Date.parse("2026-09-06T12:01:00.000Z")), 0);
});

test("closes picking exactly at the backend deadline", () => {
  const run = { status: "live", turn_deadline_at: "2026-09-06T12:01:00.000Z" };
  assert.equal(isTurnOpen(run, Date.parse("2026-09-06T12:00:59.999Z")), true);
  assert.equal(isTurnOpen(run, Date.parse("2026-09-06T12:01:00.000Z")), false);
  assert.equal(isTurnOpen({ ...run, status: "completed" }, Date.parse("2026-09-06T12:00:00.000Z")), false);
});

test("creates one stable completion celebration key", () => {
  const run = { id: "real-run", completed_at: "2026-09-06T12:05:00.000Z" };
  assert.equal(getDraftCompletionKey(run), "lakers-draft-complete-real-run-2026-09-06T12:05:00.000Z");
  assert.equal(getDraftCompletionKey({ id: "real-run", completed_at: null }), null);
});

test("validates assigned allowances against draftable games", () => {
  const allowanceMembers = [{ status: "active", gamesAllowed: 2 }, { status: "active", gamesAllowed: 1 }, { status: "inactive", gamesAllowed: 9 }];
  const games = [{ status: "draft" }, { status: "draft" }, { status: "keep" }];
  assert.deepEqual(getAllowanceSummary(allowanceMembers, games), { assigned: 3, draftable: 2, difference: 1, valid: false });
});

test("filters draft board games individually and in combination", () => {
  const games = [
    { opponent: "Sacramento Kings", date: "2026-11-06", time: "7:30 PM" },
    { opponent: "Sacramento Kings", date: "2026-12-11", time: "5:00 PM" },
    { opponent: "Boston Celtics", date: "2026-11-13", time: "8:00 PM" },
  ];
  assert.equal(filterDraftBoardGames(games, { month: "11" }).length, 2);
  assert.equal(filterDraftBoardGames(games, { opponent: "Sacramento" }).length, 2);
  assert.equal(filterDraftBoardGames(games, { day: "5" }).length, 3);
  assert.equal(filterDraftBoardGames(games, { minimumTime: "19:00" }).length, 2);
  assert.deepEqual(filterDraftBoardGames(games, { opponent: "Sacramento", month: "11", day: "5", minimumTime: "19:00" }), [games[0]]);
  assert.equal(getGameTimeMinutes("7:30 PM"), 1170);
});

test("finds the next incomplete slot", () => {
  const slots = buildSnakePickSlots(members);
  const next = getNextEligibleSlot(slots, [
    { memberId: "jason", round: 1 },
    { memberId: "huy", round: 1 },
  ]);
  assert.deepEqual(next, {
    memberId: "courtney",
    round: 1,
    overallPick: 3,
  });
});

test("allows only the current eligible member to pick", () => {
  const base = {
    memberId: "jason",
    currentMemberId: "jason",
    gamesAllowed: 2,
    gamesDrafted: 1,
    gameAvailable: true,
    draftStarted: true,
    draftPaused: false,
  };

  assert.equal(canMemberPick(base), true);
  assert.equal(canMemberPick({ ...base, memberId: "huy" }), false);
  assert.equal(canMemberPick({ ...base, gamesDrafted: 2 }), false);
  assert.equal(canMemberPick({ ...base, gameAvailable: false }), false);
  assert.equal(canMemberPick({ ...base, draftPaused: true }), false);
});
