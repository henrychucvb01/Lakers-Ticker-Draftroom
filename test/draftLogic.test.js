import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSnakePickSlots,
  canMemberPick,
  getNextEligibleSlot,
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
