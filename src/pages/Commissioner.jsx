import React, { useEffect, useState } from "react";
import { isValidMemberPin, normalizeMemberPin } from "../lib/memberPin";
import { formatCurrency, getAllowanceSummary } from "../lib/draftLogic";
import { buildGoogleCalendarUrl, isValidEmail } from "../lib/calendarInvite";

export default function Commissioner({ members, games, picks, run, order, mode, setMode, randomize, setManualOrder,
  control, reset, updateAllowance, resetMemberPin, changeSeasonAccessCode,
  paymentSummary, updateFinancialSettings, setPaymentPaid, meeting, inviteContacts,
  saveInviteContact, saveDraftMeeting }) {
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [pinEntries, setPinEntries] = useState({});
  const [seasonAccessCode, setSeasonAccessCode] = useState("");
  const [confirmAccessCode, setConfirmAccessCode] = useState("");
  const [packageCost, setPackageCost] = useState("");
  const [totalPackageGames, setTotalPackageGames] = useState("");
  const [manualOrderIds, setManualOrderIds] = useState([]);
  const [inviteEmails, setInviteEmails] = useState({});
  const [meetingForm, setMeetingForm] = useState({
    title: "Lakers Season Ticket Draft",
    date: "",
    time: "18:00",
    durationMinutes: 90,
    meetingUrl: "https://lausd.zoom.us/my/huysmeeting",
    notes: "Join us for the Lakers Season Ticket Draft.",
  });
  const allowance = getAllowanceSummary(members, games);
  const invalidRealConfiguration = mode === "real" && !allowance.valid;
  const eligibleMembers = members.filter((member) => member.status === "active" && member.gamesAllowed > 0);

  useEffect(() => {
    const settings = paymentSummary[0];
    if (!settings) return;
    setPackageCost(String(settings.package_cost));
    setTotalPackageGames(String(settings.total_package_games));
  }, [paymentSummary]);

  useEffect(() => {
    const eligibleIds = eligibleMembers.map((member) => member.id);
    const savedIds = order.map((entry) => entry.member_id).filter((id) => eligibleIds.includes(id));
    setManualOrderIds(savedIds.length === eligibleIds.length ? savedIds : eligibleIds);
  }, [members, order]);

  useEffect(() => {
    setInviteEmails(Object.fromEntries(inviteContacts.map((contact) => [contact.member_id, contact.email || ""])));
  }, [inviteContacts]);

  useEffect(() => {
    if (!meeting?.starts_at) return;
    const start = new Date(meeting.starts_at);
    const pad = (value) => String(value).padStart(2, "0");
    setMeetingForm({
      title: meeting.title || "Lakers Season Ticket Draft",
      date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      durationMinutes: meeting.duration_minutes || 90,
      meetingUrl: meeting.meeting_url || "https://lausd.zoom.us/my/huysmeeting",
      notes: meeting.notes || "Join us for the Lakers Season Ticket Draft.",
    });
  }, [meeting?.updated_at]);

  async function perform(action) {
    setError("");
    setWorking(true);
    try { await action(); } catch (caught) { setError(caught.message); }
    setWorking(false);
  }

  function confirmReset() {
    const label = mode === "test" ? "test draft" : "real draft";
    if (window.confirm(`Reset the ${label}? This will permanently clear its draft order, reveal status, and all completed picks. The game inventory and season members will remain.`)) {
      perform(reset);
    }
  }

  function confirmPinChange(member) {
    const nextPin = pinEntries[member.id] || "";
    if (!isValidMemberPin(nextPin)) {
      setError("Member PINs must contain exactly four digits.");
      return;
    }
    if (window.confirm(`Change ${member.name}'s member PIN? Their existing member sessions will be signed out.`)) {
      perform(async () => {
        await resetMemberPin(member.id, nextPin);
        setPinEntries((current) => ({ ...current, [member.id]: "" }));
      });
    }
  }

  function confirmSeasonCodeChange() {
    if (seasonAccessCode.length < 4 || seasonAccessCode.length > 64) {
      setError("Season Access Code must be between 4 and 64 characters.");
      return;
    }
    if (seasonAccessCode !== confirmAccessCode) {
      setError("Season Access Code confirmation does not match.");
      return;
    }
    if (window.confirm("Change the private Season Access Code? New devices will need the new code.")) {
      perform(async () => {
        await changeSeasonAccessCode(seasonAccessCode);
        setSeasonAccessCode("");
        setConfirmAccessCode("");
      });
    }
  }

  function moveManualMember(index, direction) {
    const destination = index + direction;
    if (destination < 0 || destination >= manualOrderIds.length) return;
    setManualOrderIds((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  function confirmManualOrder() {
    if (window.confirm("Use this manual order as the official draft order?")) {
      perform(() => setManualOrder(manualOrderIds));
    }
  }

  async function saveMeetingAndOpenCalendar() {
    const activeInvitees = members
      .filter((draftMember) => draftMember.status === "active" && draftMember.name !== "Huy")
      .map((draftMember) => ({ member: draftMember, email: (inviteEmails[draftMember.id] || "").trim() }));
    const invalidInvitee = activeInvitees.find((invitee) => !isValidEmail(invitee.email));
    if (invalidInvitee) {
      setError(`Enter a valid email address for ${invalidInvitee.member.name}.`);
      return;
    }
    let calendarUrl;
    try {
      calendarUrl = buildGoogleCalendarUrl({ ...meetingForm, emails: activeInvitees.map((invitee) => invitee.email) });
    } catch (caught) {
      setError(caught.message);
      return;
    }
    await perform(async () => {
      await Promise.all(activeInvitees.map((invitee) => saveInviteContact(invitee.member.id, invitee.email)));
      const startsAt = new Date(`${meetingForm.date}T${meetingForm.time}:00`).toISOString();
      await saveDraftMeeting({ ...meetingForm, startsAt, durationMinutes: Number(meetingForm.durationMinutes) });
      window.location.assign(calendarUrl);
    });
  }

  return <main className="commissioner-layout">
    <section className="commissioner-main">
      <div className="panel">
        <div className="panel-title-row"><h2>Draft Commissioner</h2><span className={mode === "test" ? "test-mode-pill" : "game-count"}>{mode === "test" ? "TEST MODE" : "REAL DRAFT"}</span></div>
        <div className="commissioner-help">Manage member allowances and prepare the draft. The randomized order stays hidden here and is revealed only in the Draft Room.</div>
        {error && <div className="error-text action-error">{error}</div>}
        <div className="draft-meeting-settings">
          <div className="panel-title-row"><h2>Draft Meeting Invitation</h2></div>
          <p className="muted">Set the draft time and open a completed Google Calendar invitation. Click Save in Google Calendar to email all active members.</p>
          <div className="meeting-invite-form">
            <label>Event Name<input className="text-input" value={meetingForm.title} onChange={(event) => setMeetingForm((current) => ({ ...current, title: event.target.value }))} /></label>
            <label>Date<input className="text-input" type="date" value={meetingForm.date} onChange={(event) => setMeetingForm((current) => ({ ...current, date: event.target.value }))} /></label>
            <label>Time (Pacific)<input className="text-input" type="time" value={meetingForm.time} onChange={(event) => setMeetingForm((current) => ({ ...current, time: event.target.value }))} /></label>
            <label>Length (minutes)<input className="text-input" type="number" min="15" step="15" value={meetingForm.durationMinutes} onChange={(event) => setMeetingForm((current) => ({ ...current, durationMinutes: event.target.value }))} /></label>
            <label className="meeting-wide-field">Zoom Meeting Link<input className="text-input" type="url" value={meetingForm.meetingUrl} onChange={(event) => setMeetingForm((current) => ({ ...current, meetingUrl: event.target.value }))} /></label>
            <label className="meeting-wide-field">Message<textarea className="text-input meeting-notes" value={meetingForm.notes} onChange={(event) => setMeetingForm((current) => ({ ...current, notes: event.target.value }))} /></label>
          </div>
          <div className="invite-email-list">
            <strong>Member Emails</strong>
            {members.filter((draftMember) => draftMember.status === "active" && draftMember.name !== "Huy").map((draftMember) => <label key={draftMember.id}>{draftMember.name}<input className="text-input" type="email" value={inviteEmails[draftMember.id] || ""} onChange={(event) => setInviteEmails((current) => ({ ...current, [draftMember.id]: event.target.value }))} /></label>)}
          </div>
          <button className="control-button major-action calendar-invite-button" type="button" disabled={working || !meetingForm.date || !meetingForm.time || !meetingForm.meetingUrl} onClick={saveMeetingAndOpenCalendar}>SAVE MEETING &amp; OPEN GOOGLE CALENDAR</button>
        </div>
        <div className="financial-settings">
          <div className="panel-title-row"><h2>Season Cost Calculator</h2></div>
          <div className="financial-settings-form">
            <label>Season Package Cost<input className="text-input" type="number" min="0" step="0.01" value={packageCost} onChange={(event) => setPackageCost(event.target.value)} /></label>
            <label>Total Package Games<input className="text-input" type="number" min="1" step="1" value={totalPackageGames} onChange={(event) => setTotalPackageGames(event.target.value)} /></label>
            <div><span>Cost Per Game</span><strong>{formatCurrency(Number(packageCost) / Number(totalPackageGames))}</strong></div>
            <button className="control-button major-action" type="button" disabled={working || Number(packageCost) < 0 || Number(totalPackageGames) < 1} onClick={() => perform(() => updateFinancialSettings(Number(packageCost), Number(totalPackageGames)))}>SAVE COST SETTINGS</button>
          </div>
        </div>
        <div className="allowance-list">
          <div className="panel-title-row"><h2>Member Game Allowances</h2></div>
          <div className={`allowance-total ${allowance.valid ? "valid" : "invalid"}`}>
            <strong>Games Assigned: {allowance.assigned} of {allowance.draftable}</strong>
            {!allowance.valid && <span>{allowance.difference < 0
              ? `${Math.abs(allowance.difference)} still unassigned`
              : `${allowance.difference} over-assigned`}</span>}
          </div>
          {members.filter((member) => member.status === "active").map((member) => {
            const payment = paymentSummary.find((item) => item.member_id === member.id);
            const drafted = payment?.games_drafted || 0;
            return <div className="allowance-row payment-allowance-row" key={member.id}>
              <strong>{member.name}</strong>
              <label>Games Allowed <input className="allowance-input" type="number" min="0" value={member.gamesAllowed}
                onChange={(event) => perform(() => updateAllowance(member.id, Number(event.target.value)))} /></label>
              <span>Drafted: <strong>{drafted}</strong></span><span>Amount Due: <strong>{formatCurrency(payment?.amount_due)}</strong></span>
              <span className={payment?.is_paid ? "payment-paid" : "payment-unpaid"}>{payment?.is_paid ? "PAID" : "UNPAID"}</span>
              <button className={`payment-status-button ${payment?.is_paid ? "reopen" : "paid"}`} type="button" disabled={working} onClick={() => perform(() => setPaymentPaid(member.id, !payment?.is_paid))}>{payment?.is_paid ? "REOPEN PAYMENT" : "MARK PAID"}</button>
            </div>;
          })}
        </div>
        <div className="member-pin-list">
          <div className="panel-title-row"><h2>Member PIN Management</h2></div>
          <p className="muted">Enter a new 4-digit PIN. Existing PINs are never displayed.</p>
          {members.filter((member) => member.status !== "inactive").map((member) => <div className="member-pin-row" key={member.id}>
            <strong>{member.name}</strong>
            <input className="text-input" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength="4"
              aria-label={`New PIN for ${member.name}`} placeholder="New 4-digit PIN"
              value={pinEntries[member.id] || ""}
              onChange={(event) => setPinEntries((current) => ({ ...current, [member.id]: normalizeMemberPin(event.target.value) }))} />
            <button className="control-button" type="button" disabled={working || !isValidMemberPin(pinEntries[member.id] || "")}
              onClick={() => confirmPinChange(member)}>Reset PIN</button>
          </div>)}
        </div>
        <div className="member-pin-list">
          <div className="panel-title-row"><h2>Season Access Code</h2></div>
          <p className="muted">Change the private code required before anyone can see the member list.</p>
          <div className="season-code-form">
            <input className="text-input" type="password" autoComplete="off" placeholder="New Season Access Code"
              value={seasonAccessCode} onChange={(event) => setSeasonAccessCode(event.target.value)} />
            <input className="text-input" type="password" autoComplete="off" placeholder="Confirm Access Code"
              value={confirmAccessCode} onChange={(event) => setConfirmAccessCode(event.target.value)} />
            <button className="control-button" type="button" disabled={working || seasonAccessCode.length < 4}
              onClick={confirmSeasonCodeChange}>Change Access Code</button>
          </div>
        </div>
      </div>
    </section>
    <aside className="commissioner-sidebar">
      <div className="panel"><div className="panel-title-row"><h2>Draft Controls</h2></div>
        <div className="control-section">
          <label>Draft Environment</label>
          <div className="mode-buttons"><button className={mode === "real" ? "control-button start" : "control-button"} onClick={() => setMode("real")}>Real Draft</button><button className={mode === "test" ? "control-button warning" : "control-button"} onClick={() => setMode("test")}>Test Mode</button></div>
        </div>
        <div className="control-section">
          <button className="control-button major-action" disabled={working || !run || invalidRealConfiguration} onClick={() => perform(randomize)}>RANDOMIZE DRAFT ORDER</button>
          <div className="manual-order-control">
            <strong>SET DRAFT ORDER MANUALLY</strong>
            {manualOrderIds.map((memberId, index) => {
              const draftMember = members.find((member) => member.id === memberId);
              return <div className="manual-order-row" key={memberId}>
                <span>{index + 1}. {draftMember?.name}</span>
                <div><button type="button" disabled={working || index === 0 || run?.status !== "setup"} onClick={() => moveManualMember(index, -1)} aria-label={`Move ${draftMember?.name} up`}>↑</button><button type="button" disabled={working || index === manualOrderIds.length - 1 || run?.status !== "setup"} onClick={() => moveManualMember(index, 1)} aria-label={`Move ${draftMember?.name} down`}>↓</button></div>
              </div>;
            })}
            <button className="control-button major-action" type="button" disabled={working || !run || run.status !== "setup" || invalidRealConfiguration || manualOrderIds.length === 0} onClick={confirmManualOrder}>CONFIRM MANUAL ORDER</button>
          </div>
          {run?.status === "live" ? <button className="control-button warning" onClick={() => perform(() => control("pause"))}>Pause Draft</button> : run?.status === "paused" ? <button className="control-button start" onClick={() => perform(() => control("resume"))}>Resume Draft</button> : null}
          {invalidRealConfiguration && <div className="error-text">Assign exactly {allowance.draftable} games before randomizing or starting the real draft.</div>}
          <button className="control-button danger" disabled={working || !run} onClick={confirmReset}>{mode === "test" ? "RESET TEST DRAFT" : "RESET DRAFT"}</button>
        </div>
      </div>
      <div className="panel"><div className="panel-title-row"><h2>Draft Status</h2></div><div className="control-section"><span className="muted">Status</span><div className="status-value">{run?.status || "Not configured"}</div><span className="muted">Order</span><div className="status-value">{run?.order_generated_at ? "Generated — hidden until reveal" : "Not generated"}</div></div></div>
    </aside>
  </main>;
}
