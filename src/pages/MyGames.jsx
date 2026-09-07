import React, { useEffect, useMemo, useState } from "react";
import { formatDate } from "../data/seasonData";
import { filterDraftBoardGames, formatCurrency, isTurnOpen } from "../lib/draftLogic";

function Indicator({ type }) {
  return <span className={`game-indicator ${type.toLowerCase()}`}>{type}</span>;
}

export default function MyGames({ member, games, picks, preferences, run, mode,
  isCommissioner, makePick, setPreference, paymentSummary }) {
  const [rankDrafts, setRankDrafts] = useState({});
  const [error, setError] = useState("");
  const [workingGameId, setWorkingGameId] = useState(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const [filters, setFilters] = useState({ opponent: "", month: "", day: "", date: "", minimumTime: "" });
  const preferenceMap = useMemo(
    () => new Map(preferences.map((preference) => [preference.game_id, preference])),
    [preferences]
  );
  const pickMap = useMemo(
    () => new Map(picks.map((pick) => [pick.game_id, pick])),
    [picks]
  );

  useEffect(() => {
    setRankDrafts(Object.fromEntries(preferences.map((preference) => [
      preference.game_id,
      preference.preference_rank ?? "",
    ])));
  }, [preferences]);

  useEffect(() => {
    setClockNow(Date.now());
    if (run?.status !== "live" || !run?.turn_deadline_at) return undefined;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [run?.status, run?.turn_deadline_at]);

  const rows = useMemo(() => filterDraftBoardGames(games, filters).sort((first, second) => {
    const firstPreference = preferenceMap.get(first.id);
    const secondPreference = preferenceMap.get(second.id);
    const firstRank = firstPreference?.preference_rank ?? Number.MAX_SAFE_INTEGER;
    const secondRank = secondPreference?.preference_rank ?? Number.MAX_SAFE_INTEGER;
    if (firstRank !== secondRank) return firstRank - secondRank;
    if (Boolean(firstPreference?.is_favorite) !== Boolean(secondPreference?.is_favorite)) {
      return firstPreference?.is_favorite ? -1 : 1;
    }
    return first.date.localeCompare(second.date);
  }), [games, preferenceMap, filters]);
  const opponents = useMemo(() => [...new Set(games.map((game) => game.opponent))].sort(), [games]);

  const myTurn = run?.status === "live" && run.current_member_id === member?.id;
  const commissionerTestTurn = isCommissioner && mode === "test" && run?.status === "live";
  const canPickNow = (myTurn || commissionerTestTurn) && isTurnOpen(run, clockNow);
  const draftedCount = picks.filter((pick) => pick.member_id === member?.id).length;
  const myPicks = useMemo(() => picks.filter((pick) => pick.member_id === member?.id), [picks, member?.id]);
  const payment = paymentSummary.find((item) => item.member_id === member?.id) || null;

  async function savePreference(game, values) {
    setError("");
    try {
      const current = preferenceMap.get(game.id);
      await setPreference(game.id, values.favorite ?? current?.is_favorite ?? false,
        values.rank === undefined ? current?.preference_rank ?? null : values.rank);
    } catch (caught) {
      setError(caught.message);
    }
  }

  async function selectGame(gameId) {
    setWorkingGameId(gameId);
    setError("");
    try { await makePick(gameId); } catch (caught) { setError(caught.message); }
    setWorkingGameId(null);
  }

  return <main className="commissioner-layout">
    <section className="commissioner-main full-width">
      <div className="panel my-results-panel">
        <div className="panel-title-row"><h2>MY DRAFT RESULTS</h2><span className="game-count">{myPicks.length} {mode === "test" ? "test picks" : "drafted"}</span></div>
        {mode === "test" && <div className="commissioner-help">Test picks do not affect real payment amounts or payment status.</div>}
        <div className="member-payment-summary">
          <div><span>Real Games Drafted</span><strong>{payment?.games_drafted || 0}</strong></div>
          <div><span>Cost Per Game</span><strong>{formatCurrency(payment?.cost_per_game)}</strong></div>
          <div><span>Amount Due</span><strong>{formatCurrency(payment?.amount_due)}</strong></div>
          <div><span>Payment Status</span><strong className={payment?.is_paid ? "payment-paid" : "payment-unpaid"}>{payment?.is_paid ? "PAID" : "UNPAID"}</strong></div>
        </div>
        {myPicks.length === 0 ? <p className="empty-state">No games drafted yet.</p> : <div className="draft-result-cards">{myPicks.map((pick) => <article className="draft-result-card" key={pick.id}>
          <strong className="opponent">{pick.game.opponent}{pick.game.preseason && <Indicator type="PRE" />}{pick.game.cup && <Indicator type="CUP" />}</strong>
          <span>{formatDate(pick.game.date || pick.game.game_date)}</span><span>{pick.game.time || pick.game.game_time}</span>
          <div><b>Round {pick.round}</b><b>Overall Pick #{pick.overall_pick}</b></div>
        </article>)}</div>}
      </div>
      <div className={`panel ${myTurn ? "your-turn-pulse" : ""}`}>
        <div className="panel-title-row"><h2>My Draft Board</h2><span className="game-count">{draftedCount} drafted</span></div>
        <div className="commissioner-help">Your favorites and rankings are private. Organize games here, then make your pick when your turn becomes active.</div>
        {myTurn && <div className="your-turn-alert">YOUR TURN TO PICK</div>}
        {error && <div className="error-text action-error">{error}</div>}
        <div className="draft-board-filters">
          <label>Opponent<select value={filters.opponent} onChange={(event) => setFilters((current) => ({ ...current, opponent: event.target.value }))}><option value="">All opponents</option>{opponents.map((opponent) => <option value={opponent} key={opponent}>{opponent}</option>)}</select></label>
          <label>Month<select value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}><option value="">All months</option>{["January","February","March","April","May","June","July","August","September","October","November","December"].map((month, index) => <option key={month} value={String(index + 1).padStart(2, "0")}>{month}</option>)}</select></label>
          <label>Day<select value={filters.day} onChange={(event) => setFilters((current) => ({ ...current, day: event.target.value }))}><option value="">All days</option>{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((day, index) => <option key={day} value={String(index)}>{day}</option>)}</select></label>
          <label>Date<input type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} /></label>
          <label>Starts At/After<input type="time" value={filters.minimumTime} onChange={(event) => setFilters((current) => ({ ...current, minimumTime: event.target.value }))} /></label>
          <button className="clear-filters-button" type="button" onClick={() => setFilters({ opponent: "", month: "", day: "", date: "", minimumTime: "" })}>Clear Filters</button>
        </div>
        <div className="games-wrap"><table className="games-table my-draft-board-table">
          <thead><tr><th>Favorite</th><th>Rank</th><th>Opponent</th><th>Date</th><th>Time</th><th>Round</th><th>Overall Pick</th><th>Draft Status</th><th>Pick</th></tr></thead>
          <tbody>{rows.map((game) => {
            const preference = preferenceMap.get(game.id);
            const pick = pickMap.get(game.id);
            const myPick = pick?.member_id === member?.id;
            const available = game.status === "draft" && !pick;
            return <tr key={game.id} className={myPick ? "my-drafted-game" : ""}>
              <td><button className={`watch-button ${preference?.is_favorite ? "favorite" : ""}`} type="button"
                aria-label={`${preference?.is_favorite ? "Remove" : "Add"} ${game.opponent} favorite`}
                onClick={() => savePreference(game, { favorite: !preference?.is_favorite })}>{preference?.is_favorite ? "★" : "☆"}</button></td>
              <td><input className="rank-input" type="number" min="1" aria-label={`Rank ${game.opponent}`}
                value={rankDrafts[game.id] ?? ""} placeholder="—"
                onChange={(event) => setRankDrafts((current) => ({ ...current, [game.id]: event.target.value }))}
                onBlur={(event) => savePreference(game, { rank: event.target.value ? Number(event.target.value) : null })} /></td>
              <td className="opponent">{game.opponent}{game.preseason && <Indicator type="PRE" />}{game.cup && <Indicator type="CUP" />}</td>
              <td>{formatDate(game.date)}</td><td>{game.time}</td>
              <td>{myPick ? <strong>{pick.round}</strong> : "—"}</td><td>{myPick ? <strong>#{pick.overall_pick}</strong> : "—"}</td>
              <td>{myPick ? <strong>DRAFTED</strong>
                : pick ? `Selected by ${pick.member?.name || "another member"}`
                : game.status === "keep" ? "Commissioner Keep"
                : game.status === "not-owned" ? "Not Available" : "Available"}</td>
              <td>{available ? <button className={`select-button ${canPickNow ? "ready-to-pick" : ""}`} type="button"
                disabled={!canPickNow || workingGameId === game.id}
                onClick={() => selectGame(game.id)}>{workingGameId === game.id ? "Picking…" : "MAKE PICK"}</button>
                : <span className="unavailable-pick">{myPick ? "DRAFTED" : "UNAVAILABLE"}</span>}</td>
            </tr>;
          })}{rows.length === 0 && <tr><td className="empty-state" colSpan="9">No games match these filters.</td></tr>}</tbody>
        </table></div>
      </div>
    </section>
  </main>;
}
