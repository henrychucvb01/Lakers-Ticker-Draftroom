import test from "node:test";
import assert from "node:assert/strict";
import { buildGoogleCalendarUrl, isValidEmail } from "../src/lib/calendarInvite.js";

test("validates invitation email addresses", () => {
  assert.equal(isValidEmail("member@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
});

test("creates a Google Calendar invitation with guests and Zoom link", () => {
  const result = buildGoogleCalendarUrl({
    title: "Lakers Draft",
    date: "2026-10-10",
    time: "18:30",
    durationMinutes: 90,
    meetingUrl: "https://lausd.zoom.us/my/huysmeeting",
    notes: "Draft night",
    emails: ["one@example.com", "two@example.com"],
  });
  const url = new URL(result);
  assert.equal(url.origin, "https://calendar.google.com");
  assert.equal(url.searchParams.get("location"), "https://lausd.zoom.us/my/huysmeeting");
  assert.deepEqual(url.searchParams.getAll("add"), ["one@example.com", "two@example.com"]);
  assert.equal(url.searchParams.get("dates"), "20261010T183000/20261010T200000");
});
