import React from "react";
import { formatDate } from "../data/seasonData";

function Indicator({ type }) {
  return <span className={`game-indicator ${type.toLowerCase()}`}>{type}</span>;
}

export default function MyGames({ member, picks }) {
  const myPicks = picks.filter((pick) => pick.member_id === member?.id);

  return (
    <main className="commissioner-layout">
      <section className="commissioner-main full-width">
        <div className="panel">
          <div className="panel-title-row">
            <h2>My Games</h2>
            <span className="game-count">{myPicks.length} selected</span>
          </div>
          <div className="games-wrap">
            <table className="games-table">
              <thead><tr><th>Opponent</th><th>Date</th><th>Time</th><th>Round</th><th>Pick</th></tr></thead>
              <tbody>
                {myPicks.map((pick) => (
                  <tr key={pick.id}>
                    <td className="opponent">
                      {pick.game.opponent}
                      {pick.game.preseason && <Indicator type="PRE" />}
                      {pick.game.cup && <Indicator type="CUP" />}
                    </td>
                    <td>{formatDate(pick.game.game_date)}</td>
                    <td>{pick.game.game_time}</td>
                    <td>{pick.round}</td>
                    <td>#{pick.overall_pick}</td>
                  </tr>
                ))}
                {myPicks.length === 0 && <tr><td colSpan="5" className="empty-state">No games selected yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
