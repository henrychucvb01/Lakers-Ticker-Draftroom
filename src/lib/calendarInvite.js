export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function calendarStamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

export function buildGoogleCalendarUrl({ title, date, time, durationMinutes, meetingUrl, notes, emails }) {
  if (!date || !time || !meetingUrl) throw new Error("Date, time, and Zoom link are required.");
  const startsAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startsAt.getTime())) throw new Error("Enter a valid meeting date and time.");
  const endsAt = new Date(startsAt.getTime() + Number(durationMinutes || 60) * 60_000);
  const validEmails = (emails || []).map((email) => String(email || "").trim()).filter(isValidEmail);
  if (validEmails.length === 0) throw new Error("Add at least one valid member email address.");

  const parameters = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "Lakers Season Ticket Draft",
    dates: `${calendarStamp(startsAt)}/${calendarStamp(endsAt)}`,
    ctz: "America/Los_Angeles",
    details: [notes || "Lakers Season Ticket Draft Room", `Join Zoom: ${meetingUrl}`].filter(Boolean).join("\n\n"),
    location: meetingUrl,
  });
  validEmails.forEach((email) => parameters.append("add", email));
  return `https://calendar.google.com/calendar/render?${parameters.toString()}`;
}
