import React, { useEffect, useState } from "react";
import { isValidMemberPin, normalizeMemberPin } from "../lib/memberPin";
import { formatCurrency, getAllowanceSummary } from "../lib/draftLogic";

export default function Commissioner({ members, games, picks, run, mode, setMode, randomize,
  control, reset, updateAllowance, resetMemberPin, changeSeasonAccessCode,
  paymentSummary, updateFinancialSettings, setPaymentPaid }) {
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [pinEntries, setPinEntries] = useState({});
  const [seasonAccessCode, setSeasonAccessCode] = useState("");
  const [confirmAccessCode, setConfirmAccessCode] = useState("");
  const [packageCost, setPackageCost] = useState("");
  const [totalPackageGames, setTotalPackageGames] = useState("");
  const allowance = getAllowanceSummary(members, games);
  const invalidRealConfiguration = mode === "real" && !allowance.valid;

  useEffect(() => {
    const settings = paymentSummary[0];
    if (!settings) return;
    setPackageCost(String(settings.package_cost));
    setTotalPackageGames(String(settings.total_package_games));
  }, [paymentSummary]);

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

  return <main className="commissioner-layout">
    <section className="commissioner-main">
      <div className="panel">
        <div className="panel-title-row"><h2>Draft Commissioner</h2><span className={mode === "test" ? "test-mode-pill" : "game-count"}>{mode === "test" ? "TEST MODE" : "REAL DRAFT"}</span></div>
        <div className="commissioner-help">Manage member allowances and prepare the draft. The randomized order stays hidden here and is revealed only in the Draft Room.</div>
        {error && <div className="error-text action-error">{error}</div>}
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
        <div className="control-section"><label>Pick Clock</label><select className="text-input" value={run?.pick_clock_seconds || 90} onChange={(event) => perform(() => control("clock", Number(event.target.value)))}><option value={30}>30 seconds</option><option value={60}>1 minute</option><option value={90}>1:30</option><option value={120}>2 minutes</option><option value={180}>3 minutes</option></select></div>
        <div className="control-section">
          <button className="control-button major-action" disabled={working || !run || invalidRealConfiguration} onClick={() => perform(randomize)}>RANDOMIZE DRAFT ORDER</button>
          {run?.status === "live" ? <button className="control-button warning" onClick={() => perform(() => control("pause"))}>Pause Draft</button> : run?.status === "paused" ? <button className="control-button start" onClick={() => perform(() => control("resume"))}>Resume Draft</button> : null}
          {invalidRealConfiguration && <div className="error-text">Assign exactly {allowance.draftable} games before randomizing or starting the real draft.</div>}
          <button className="control-button danger" disabled={working || !run} onClick={confirmReset}>{mode === "test" ? "RESET TEST DRAFT" : "RESET DRAFT"}</button>
        </div>
      </div>
      <div className="panel"><div className="panel-title-row"><h2>Draft Status</h2></div><div className="control-section"><span className="muted">Status</span><div className="status-value">{run?.status || "Not configured"}</div><span className="muted">Order</span><div className="status-value">{run?.order_generated_at ? "Generated — hidden until reveal" : "Not generated"}</div></div></div>
    </aside>
  </main>;
}
