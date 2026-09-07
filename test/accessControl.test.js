import test from "node:test";
import assert from "node:assert/strict";
import { canAccessPage, resolvePermittedPage } from "../src/lib/accessControl.js";

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
