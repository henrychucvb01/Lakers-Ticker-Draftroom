import React, { useEffect, useMemo, useState } from "react";
import { formatDate } from "../data/seasonData";
import { canRevealDraftOrder } from "../lib/accessControl";
import { getDraftCompletionKey } from "../lib/draftLogic";

function Indicator({ type }) {
  return <span className={`game-indicator ${type.toLowerCase()}`}>{type}</span>;
}

export default function DraftRoom({ members, member, run, order, picks, availableGames,
  isCommissioner, mode, realtimeStatus, reveal, completeReveal, makePick, control, setTakeover, takeoverPick }) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [message, setMessage] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [takeoverMemberId, setTakeoverMemberId] = useState("");
  const [workingGameId, setWorkingGameId] = useState(null);
  const currentPicker = members.find((item) => item.id === run?.current_member_id) || null;
  const isMyTurn = Boolean(run?.status === "live" && member?.id === run.current_member_id);
  const commissionerCanTest = Boolean(isCommissioner && mode === "test" && run?.status === "live");
  const showTurnAlert = isMyTurn || commissionerCanTest;
  const visibleOrder = run?.reveal_started_at ? order : [];
  const rounds = useMemo(() => Math.max(0, ...members.filter((item) => item.status === "active").map((item) => item.gamesAllowed)), [members]);
  const myPicks = useMemo(() => picks.filter((pick) => pick.member_id === member?.id), [picks, member?.id]);
  const recentPicks = useMemo(() => [...picks].slice(-5).reverse(), [picks]);
  const takeoverMembers = useMemo(() => members.filter((draftMember) => {
    const drafted = picks.filter((pick) => pick.member_id === draftMember.id).length;
    return draftMember.status === "active" && drafted < draftMember.gamesAllowed;
  }), [members, picks]);
  const takeoverActive = Boolean(isCommissioner && run?.status === "live" && run?.takeover_enabled);
  const mayPick = isMyTurn || commissionerCanTest;
  const commissionerCanStart = Boolean(isCommissioner && run?.status === "setup" && run?.reveal_completed_at);

  useEffect(() => {
    const preferredMemberId = currentPicker?.id || takeoverMembers[0]?.id || "";
    setTakeoverMemberId((current) => takeoverMembers.some((draftMember) => draftMember.id === current) ? current : preferredMemberId);
  }, [currentPicker?.id, takeoverMembers]);

  useEffect(() => {
    if (run?.status !== "completed" || !run?.completed_at) return undefined;
    const celebrationKey = getDraftCompletionKey(run);
    if (window.localStorage.getItem(celebrationKey)) return undefined;
    window.localStorage.setItem(celebrationKey, "shown");
    setShowConfetti(true);
    setShowCompletionModal(true);
    const timer = window.setTimeout(() => setShowConfetti(false), 5000);
    return () => window.clearTimeout(timer);
  }, [run?.id, run?.status, run?.completed_at]);

  useEffect(() => {
    if (!run?.reveal_started_at || visibleOrder.length === 0) {
      setRevealedCount(0);
      return undefined;
    }
    const update = () => {
      const elapsed = Date.now() - new Date(run.reveal_started_at).getTime();
      const count = Math.min(visibleOrder.length, Math.floor(elapsed / 3000) + 1);
      setRevealedCount(count);
      if (count === visibleOrder.length && !run.reveal_completed_at) completeReveal().catch(() => {});
    };
    update();
    const timer = window.setInterval(update, 500);
    return () => window.clearInterval(timer);
  }, [run?.reveal_started_at, run?.reveal_completed_at, visibleOrder.length, completeReveal]);

  async function selectGame(gameId) {
    setMessage("");
    setWorkingGameId(gameId);
    try {
      if (takeoverActive) await takeoverPick(takeoverMemberId, gameId);
      else await makePick(gameId);
    } catch (error) {
      setMessage(error.message);
    }
    setWorkingGameId(null);
  }

  const statusMessage = !run?.order_generated_at ? "Waiting for the Commissioner to randomize the draft order."
    : !run.reveal_started_at ? "The draft order is ready for its reveal."
    : !run.reveal_completed_at ? "Draft order reveal in progress."
    : run.status === "setup" ? "Draft order revealed. Waiting for the Commissioner to start the draft."
    : run.status === "paused" ? "Draft is currently paused."
    : run.status === "completed" ? "The draft is complete."
    : "The draft is live.";

  return <main className="draft-room-page">
    <section className={`compact-draft-status panel ${showTurnAlert ? "your-turn-pulse" : ""}`}>
      <div className="compact-picker"><span className="small-label">CURRENT PICKER</span><strong>{currentPicker?.name || "Waiting"}</strong><span>Pick #{run?.overall_pick || "—"}</span></div>
      <div className="compact-status-copy"><span className="small-label">DRAFT STATUS</span><strong>{statusMessage}</strong></div>
      <span className={`realtime-status ${realtimeStatus === "SUBSCRIBED" ? "connected" : "connecting"}`}>{realtimeStatus === "SUBSCRIBED" ? "LIVE SYNC" : "RECONNECTING…"}</span>
      {mode === "test" && <span className="test-mode-pill">TEST MODE</span>}
      {showTurnAlert && <div className="compact-turn-alert">YOUR TURN{commissionerCanTest && currentPicker ? ` — SIMULATING ${currentPicker.name.toUpperCase()}` : ""}</div>}
      {canRevealDraftOrder(isCommissioner, run) && <button className="primary-button compact-reveal-button" type="button" onClick={() => reveal().catch((error) => setMessage(error.message))}>REVEAL DRAFT ORDER</button>}
      {commissionerCanStart && <button className="control-button start compact-start-button" type="button" onClick={() => control("start").catch((error) => setMessage(error.message))}>START DRAFT</button>}
      {isCommissioner && run?.status === "live" && <div className={`draft-room-takeover ${takeoverActive ? "active" : ""}`}>
        <button className={takeoverActive ? "control-button danger" : "control-button major-action"} type="button" onClick={() => setTakeover(!takeoverActive).catch((error) => setMessage(error.message))}>{takeoverActive ? "TURN OFF TAKEOVER" : "COMMISSIONER TAKEOVER"}</button>
        {takeoverActive && <label>Pick For<select className="text-input" value={takeoverMemberId} onChange={(event) => setTakeoverMemberId(event.target.value)}>{takeoverMembers.map((draftMember) => <option key={draftMember.id} value={draftMember.id}>{draftMember.name}</option>)}</select></label>}
      </div>}
      {message && <div className="error-text compact-error">{message}</div>}
    </section>

    <section className="draft-order-bar panel">
      <strong className="draft-order-label">DRAFT ORDER</strong>
      <div className="draft-order-members">{visibleOrder.slice(0, revealedCount).map((entry) => <span className={run?.current_member_id === entry.member_id ? "current-picker-order" : ""} key={entry.id}>{entry.position}. {entry.member.name}</span>)}{visibleOrder.length === 0 && <span className="order-hidden">Order not revealed</span>}</div>
      <strong className="games-remaining-total">{availableGames.length} Games Remaining</strong>
    </section>

    <section className="draft-priority-grid">
      <div className="panel available-games-panel">
        <div className="panel-title-row"><h2>Available Games</h2><span className="game-count">{availableGames.length} available</span></div>
        <div className="games-wrap"><table className="games-table"><thead><tr><th>Rank</th><th>Opponent</th><th>Date & Time</th><th>Select</th></tr></thead>
          <tbody>{availableGames.map((game, index) => <tr key={game.id}><td>{index + 1}</td><td className="opponent">{game.opponent}{game.preseason && <Indicator type="PRE" />}{game.cup && <Indicator type="CUP" />}</td><td><div>{formatDate(game.date)}</div><span className="muted">{game.time}</span></td><td><button className={`select-button ${takeoverActive ? "takeover-pick-button" : ""}`} disabled={workingGameId === game.id || (takeoverActive ? !takeoverMemberId : !mayPick)} onClick={() => selectGame(game.id)} type="button">{workingGameId === game.id ? "Picking…" : takeoverActive ? `PICK FOR ${takeoverMembers.find((draftMember) => draftMember.id === takeoverMemberId)?.name?.toUpperCase() || "MEMBER"}` : "Select"}</button></td></tr>)}</tbody></table></div>
      </div>

      <div className="draft-board-column">
        <div className="panel prominent-draft-board">
          <div className="panel-title-row"><h2>Draft Board</h2><span className="muted">Snake Draft</span></div>
          <div className="draft-board-wrap"><table className="draft-board"><thead><tr><th>Round</th>{visibleOrder.map((entry) => <th key={entry.id} className={run?.current_member_id === entry.member_id ? "active-column" : ""}>{entry.member.name}</th>)}</tr></thead>
            <tbody>{Array.from({ length: rounds }, (_, index) => index + 1).map((round) => <tr key={round}><td className="round-cell">{round}</td>{visibleOrder.map((entry) => { const pick = picks.find((item) => item.round === round && item.member_id === entry.member_id); return <td key={entry.id} className={run?.current_member_id === entry.member_id ? "active-column" : ""}>{pick ? <div className="draft-grid-result"><strong>{pick.game.opponent}</strong><span>{formatDate(pick.game.date || pick.game.game_date)}</span><span>{pick.game.time || pick.game.game_time}</span></div> : "—"}</td>; })}</tr>)}</tbody></table></div>
        </div>

        <div className="panel compact-shared-panel my-results-panel">
          <div className="panel-title-row"><h2>MY DRAFT RESULTS</h2><span className="game-count">{myPicks.length} drafted</span></div>
          {myPicks.length === 0 ? <p className="muted panel-empty-message">No games drafted yet.</p> : <div className="games-wrap"><table className="games-table compact-results-table"><thead><tr><th>Opponent</th><th>Date</th><th>Time</th><th>Round</th><th>Overall Pick</th></tr></thead><tbody>{myPicks.map((pick) => <tr className="my-drafted-game" key={pick.id}><td className="opponent">{pick.game.opponent}{pick.game.preseason && <Indicator type="PRE" />}{pick.game.cup && <Indicator type="CUP" />}</td><td>{formatDate(pick.game.date || pick.game.game_date)}</td><td>{pick.game.time || pick.game.game_time}</td><td>{pick.round}</td><td>#{pick.overall_pick}</td></tr>)}</tbody></table></div>}
        </div>

        <div className="panel compact-shared-panel"><div className="panel-title-row"><h2>Recent Picks</h2><span className="muted">Latest selections</span></div>{recentPicks.length === 0 ? <p className="muted panel-empty-message">No picks made yet.</p> : <div className="recent-picks-list">{recentPicks.map((pick) => <div className="recent-pick-row" key={pick.id}><span>#{pick.overall_pick}</span><strong>{pick.member?.name}</strong><span>{pick.game.opponent}</span><small>{formatDate(pick.game.date || pick.game.game_date)} · {pick.game.time || pick.game.game_time}</small></div>)}</div>}</div>

      </div>
    </section>

    {showConfetti && <div className="confetti-page-layer" aria-hidden="true">{Array.from({ length: 50 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 10) * 0.07}s`, transform: `rotate(${index * 19}deg)` }} />)}</div>}
    {showCompletionModal && <div className="draft-complete-overlay" role="presentation" onClick={() => setShowCompletionModal(false)}>
      <section className="draft-complete-modal" role="dialog" aria-modal="true" aria-labelledby="draft-complete-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-button" type="button" aria-label="Close draft complete results" onClick={() => setShowCompletionModal(false)}>×</button>
        <div className="draft-complete-modal-heading"><h2 id="draft-complete-title">DRAFT COMPLETE</h2><p>Final draft results</p></div>
        <div className="modal-results-wrap"><table className="games-table compact-results-table"><thead><tr><th>Pick</th><th>Member</th><th>Opponent</th><th>Date</th><th>Time</th><th>Round</th></tr></thead><tbody>{picks.map((pick) => <tr key={pick.id}><td>#{pick.overall_pick}</td><td><strong>{pick.member?.name}</strong></td><td>{pick.game.opponent}</td><td>{formatDate(pick.game.date || pick.game.game_date)}</td><td>{pick.game.time || pick.game.game_time}</td><td>{pick.round}</td></tr>)}</tbody></table></div>
      </section>
    </div>}
  </main>;
}
