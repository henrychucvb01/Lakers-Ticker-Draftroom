import test from "node:test";
import assert from "node:assert/strict";
import { isValidMemberPin, normalizeMemberPin, preserveSelectedMemberId } from "../src/lib/memberPin.js";

test("normalizes PIN entry to four numeric characters", () => {
  assert.equal(normalizeMemberPin("1a2-345"), "1234");
});

test("accepts exactly four digits", () => {
  assert.equal(isValidMemberPin("0424"), true);
  assert.equal(isValidMemberPin("424"), false);
  assert.equal(isValidMemberPin("12345"), false);
  assert.equal(isValidMemberPin("12a4"), false);
});

test("member-list refresh preserves Courtney's selected account", () => {
  const members = [
    { member_id: "huy", member_name: "Huy" },
    { member_id: "courtney", member_name: "Courtney" },
  ];
  assert.equal(preserveSelectedMemberId(members, "courtney"), "courtney");
});

test("member-list refresh defaults only when the selection is unavailable", () => {
  const members = [
    { member_id: "huy", member_name: "Huy" },
    { member_id: "courtney", member_name: "Courtney" },
  ];
  assert.equal(preserveSelectedMemberId(members, ""), "huy");
  assert.equal(preserveSelectedMemberId(members, "inactive-member"), "huy");
});
