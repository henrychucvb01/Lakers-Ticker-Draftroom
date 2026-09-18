import test from "node:test";
import assert from "node:assert/strict";
import { canAccessPage, canRevealDraftOrder, didAuthenticatedUserChange, resolvePermittedPage } from "../src/lib/accessControl.js";

test("regular members cannot open Commissioner-only pages", () => {
  for (const page of ["games", "members", "commissioner"]) {
    assert.equal(canAccessPage(page, false), false);
    assert.equal(resolvePermittedPage(page, false), "draft");
  }
});

test("regular members retain member navigation", () => {
  assert.equal(resolvePermittedPage("draft", false), "draft");
  assert.equal(resolvePermittedPage("my-games", false), "my-games");
});

test("the verified Commissioner can open every page", () => {
  for (const page of ["draft", "my-games", "games", "members", "commissioner"]) {
    assert.equal(canAccessPage(page, true), true);
    assert.equal(resolvePermittedPage(page, true), page);
  }
});

test("token refresh for the same device does not clear member identity", () => {
  assert.equal(didAuthenticatedUserChange("device-user", "device-user"), false);
});

test("login, logout, and a different device user reset member identity", () => {
  assert.equal(didAuthenticatedUserChange(null, "device-user"), true);
  assert.equal(didAuthenticatedUserChange("device-user", null), true);
  assert.equal(didAuthenticatedUserChange("device-user", "different-user"), true);
});

test("only the Commissioner can reveal a generated draft order", () => {
  const readyRun = { order_generated_at: "2026-09-17T12:00:00Z", reveal_started_at: null };
  assert.equal(canRevealDraftOrder(false, readyRun), false);
  assert.equal(canRevealDraftOrder(true, readyRun), true);
  assert.equal(canRevealDraftOrder(true, { ...readyRun, reveal_started_at: "2026-09-17T12:01:00Z" }), false);
});
