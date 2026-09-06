import React, { useEffect, useMemo, useState } from "react";
import { formatDate } from "../data/seasonData";

function Indicator({ type }) {
  return <span className={`game-indicator ${type.toLowerCase()}`}>{type}</span>;
}

export default function DraftRoom({ members, member, run, order, picks, availableGames,
  isCommissioner, mode, reveal, completeReveal, makePick }) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [message, setMessage] = useState("");
  const currentPicker = members.find((item) => item.id === run?.current_member_id) || null;
  const isMyTurn = Boolean(run?.status === "live" && member?.id === run.current_member_id);
  const commissionerCanTest = Boolean(isCommissioner && mode === "test" && run?.status === "live");
  const mayPick = isMyTurn || commissionerCanTest;
  const showTurnAlert = isMyTurn || commissionerCanTest;
  const visibleOrder = run?.reveal_started_at ? order : [];
  const rounds = useMemo(() => Math.max(0, ...members.filter((item) => item.status === "active").map((item) => item.gamesAllowed)), [members]);

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
    try {
      await makePick(gameId);
    } catch (error) {
      setMessage(error.message);
    }
  }

  const statusMessage = !run?.order_generated_at ? "Waiting for the Commissioner to randomize the draft order."
    : !run.reveal_started_at ? "The draft order is ready for its reveal."
    : run.status === "setup" ? "Draft order revealed. Waiting for the Commissioner to start the draft."
    : run.status === "paused" ? "Draft is currently paused."
    : run.status === "completed" ? "The draft is complete."
    : "The draft is live.";

  return <main className="draft-layout">
    <section className="main-column">
      <div className={`panel ${showTurnAlert ? "your-turn-pulse" : ""}`}>
        <div className="panel-title-row"><h2>Draft Status</h2>{mode === "test" && <span className="test-mode-pill">TEST MODE</span>}</div>
        {showTurnAlert && <div className="your-turn-alert">YOUR TURN TO PICK{commissionerCanTest && currentPicker ? ` — SIMULATING ${currentPicker.name.toUpperCase()}` : ""}</div>}
        <div className="draft-message">{statusMessage}</div>
        {currentPicker && <div className="current-picker-banner"><div><span className="small-label">CURRENT PICKER</span><strong>{currentPicker.name}</strong></div><div className="banner-pick">Pick #{run.overall_pick}</div></div>}
        {message && <div className="error-text action-error">{message}</div>}
      </div>

      {run?.order_generated_at && !run.reveal_started_at && <div className="panel reveal-panel">
        <h2>Draft Order Ready</h2><p>The randomized order is locked and ready to reveal.</p>
        <button className="primary-button" type="button" onClick={() => reveal().catch((error) => setMessage(error.message))}>REVEAL DRAFT ORDER</button>
      </div>}

      {run?.reveal_started_at && <div className="panel">
        <div className="panel-title-row"><h2>Draft Order</h2><span className="muted">Snake Draft</span></div>
        <div className="draft-reveal-list">{visibleOrder.slice(0, revealedCount).map((entry) => <div className="draft-reveal-entry" key={entry.id}><span>#{entry.position}</span><strong>{entry.member.name}</strong></div>)}</div>
      </div>}

      <div className="panel">
        <div className="panel-title-row"><h2>Draft Board</h2><span className="muted">Snake Draft</span></div>
        <div className="draft-board-wrap"><table className="draft-board"><thead><tr><th>Round</th>{visibleOrder.map((entry) => <th key={entry.id} className={run?.current_member_id === entry.member_id ? "active-column" : ""}>{entry.member.name}</th>)}</tr></thead>
          <tbody>{Array.from({ length: rounds }, (_, index) => index + 1).map((round) => <tr key={round}><td className="round-cell">{round}</td>{visibleOrder.map((entry) => {
            const pick = picks.find((item) => item.round === round && item.member_id === entry.member_id);
            return <td key={entry.id} className={run?.current_member_id === entry.member_id ? "active-column" : ""}>{pick?.game?.opponent || "—"}</td>;
          })}</tr>)}</tbody></table></div>
      </div>

      <div className="panel">
        <div className="panel-title-row"><h2>Available Games</h2><span className="game-count">{availableGames.length} available</span></div>
        <div className="games-wrap"><table className="games-table"><thead><tr><th>Rank</th><th>Opponent</th><th>Date & Time</th><th>Select</th></tr></thead>
          <tbody>{availableGames.map((game, index) => <tr key={game.id}><td>{index + 1}</td><td className="opponent">{game.opponent}{game.preseason && <Indicator type="PRE" />}{game.cup && <Indicator type="CUP" />}</td><td><div>{formatDate(game.date)}</div><span className="muted">{game.time}</span></td><td><button className="select-button" disabled={!mayPick} onClick={() => selectGame(game.id)} type="button">Select</button></td></tr>)}</tbody></table></div>
      </div>
    </section>
    <aside className="sidebar"><div className={`active-card ${showTurnAlert ? "your-turn-pulse" : ""}`}><span className="small-label light">ACTIVE</span><h2>{currentPicker?.name || "Waiting"}</h2><div className="active-subtitle">{run?.status === "live" ? "Current Picker" : "Draft Not Live"}</div><div className="timer">{String(Math.floor((run?.pick_clock_seconds || 90) / 60)).padStart(2, "0")}:{String((run?.pick_clock_seconds || 90) % 60).padStart(2, "0")}</div><div className="timer-label">Pick Clock</div></div>
      <div className="panel sidebar-panel"><div className="panel-title-row"><h2>Games Remaining</h2></div><div className="draft-order-list">{members.filter((item) => item.status === "active").map((item) => { const drafted = picks.filter((pick) => pick.member_id === item.id).length; return <div className="draft-order-row" key={item.id}><span>{item.name}</span><strong>{Math.max(0, item.gamesAllowed - drafted)}</strong></div>; })}</div></div>
    </aside>
  </main>;
}
