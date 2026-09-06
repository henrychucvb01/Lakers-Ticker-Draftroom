import React, { useState } from "react";

export default function Commissioner({ members, picks, run, mode, setMode, randomize,
  control, reset, updateAllowance }) {
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

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

  return <main className="commissioner-layout">
    <section className="commissioner-main">
      <div className="panel">
        <div className="panel-title-row"><h2>Draft Commissioner</h2><span className={mode === "test" ? "test-mode-pill" : "game-count"}>{mode === "test" ? "TEST MODE" : "REAL DRAFT"}</span></div>
        <div className="commissioner-help">Manage member allowances and prepare the draft. The randomized order stays hidden here and is revealed only in the Draft Room.</div>
        {error && <div className="error-text action-error">{error}</div>}
        <div className="allowance-list">
          <div className="panel-title-row"><h2>Member Game Allowances</h2></div>
          {members.filter((member) => member.status === "active").map((member) => {
            const drafted = picks.filter((pick) => pick.member_id === member.id).length;
            return <div className="allowance-row" key={member.id}>
              <strong>{member.name}</strong>
              <label>Games Allowed <input className="allowance-input" type="number" min="0" value={member.gamesAllowed}
                onChange={(event) => perform(() => updateAllowance(member.id, Number(event.target.value)))} /></label>
              <span>Drafted: <strong>{drafted}</strong></span><span>Remaining: <strong>{Math.max(0, member.gamesAllowed - drafted)}</strong></span>
            </div>;
          })}
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
          <button className="control-button" disabled={working || !run} onClick={() => perform(randomize)}>RANDOMIZE DRAFT ORDER</button>
          <button className={run?.check_in_open ? "control-button warning" : "control-button"} disabled={working || !run} onClick={() => perform(() => control(run.check_in_open ? "close-check-in" : "open-check-in"))}>{run?.check_in_open ? "Close Check-In" : "Open Check-In"}</button>
          {run?.status === "live" ? <button className="control-button warning" onClick={() => perform(() => control("pause"))}>Pause Draft</button> : run?.status === "paused" ? <button className="control-button start" onClick={() => perform(() => control("resume"))}>Resume Draft</button> : <button className="control-button start" disabled={!run?.order_generated_at} onClick={() => perform(() => control("start"))}>Start Draft</button>}
          <button className="control-button danger" disabled={working || !run} onClick={confirmReset}>{mode === "test" ? "RESET TEST DRAFT" : "RESET DRAFT"}</button>
        </div>
      </div>
      <div className="panel"><div className="panel-title-row"><h2>Draft Status</h2></div><div className="control-section"><span className="muted">Status</span><div className="status-value">{run?.status || "Not configured"}</div><span className="muted">Order</span><div className="status-value">{run?.order_generated_at ? "Generated — hidden until reveal" : "Not generated"}</div></div></div>
    </aside>
  </main>;
}
