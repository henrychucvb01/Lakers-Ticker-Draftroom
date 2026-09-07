import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSnakePickSlots,
  canMemberPick,
  calculateMemberAmountDue,
  countRealDraftedGames,
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

test("test picks never create a real payment obligation", () => {
  const runs = [{ id: "real-run", mode: "real" }, { id: "test-run", mode: "test" }];
  const picks = Array.from({ length: 6 }, (_, index) => ({
    id: `test-${index}`,
    draft_run_id: "test-run",
    member_id: "huy",
  }));
  const gamesDrafted = countRealDraftedGames(picks, runs, "huy");
  assert.equal(gamesDrafted, 0);
  assert.equal(calculateMemberAmountDue(4200, 21, gamesDrafted), 0);
});

test("each saved real pick increments games drafted and amount due", () => {
  const runs = [{ id: "real-run", mode: "real" }, { id: "test-run", mode: "test" }];
  const picks = [
    { id: "test-1", draft_run_id: "test-run", member_id: "huy" },
    { id: "real-1", draft_run_id: "real-run", member_id: "huy" },
    { id: "real-2", draft_run_id: "real-run", member_id: "huy" },
    { id: "real-other", draft_run_id: "real-run", member_id: "jason" },
  ];
  assert.equal(countRealDraftedGames(picks.slice(0, 2), runs, "huy"), 1);
  assert.equal(calculateMemberAmountDue(4200, 21, 1), 200);
  assert.equal(countRealDraftedGames(picks, runs, "huy"), 2);
  assert.equal(calculateMemberAmountDue(4200, 21, 2), 400);
});

test("real payment totals remain deterministic after data reload", () => {
  const runs = [{ id: "real-run", mode: "real" }];
  const storedPicks = [
    { id: "real-1", draft_run_id: "real-run", member_id: "huy" },
    { id: "real-2", draft_run_id: "real-run", member_id: "huy" },
  ];
  const reloadedPicks = JSON.parse(JSON.stringify(storedPicks));
  const gamesDrafted = countRealDraftedGames(reloadedPicks, runs, "huy");
  assert.equal(gamesDrafted, 2);
  assert.equal(calculateMemberAmountDue(4200, 21, gamesDrafted), 400);
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
