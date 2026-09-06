import React from "react";
import { formatDate } from "../data/seasonData";

export default function DraftRoom({
  players,
  currentPicker,
  games,
  draftStarted,
  draftPaused,
  checkInOpen,
  clockSeconds,
}) {
  const minutes = Math.floor(clockSeconds / 60);
  const seconds = clockSeconds % 60;

  return (
    <main className="draft-layout">
      <section className="main-column">
        <div className="panel">
          <div className="panel-title-row">
            <h2>Draft Status</h2>
          </div>

          <div className="draft-message">
            {!draftStarted
              ? checkInOpen
                ? "Check-in is open. Review the available games while you wait."
                : "Waiting for the Commissioner to open check-in."
              : draftPaused
              ? "Draft is currently paused."
              : "Draft has been started by the Commissioner."}
          </div>

          {currentPicker && (
            <div className="current-picker-banner">
              <div>
                <span className="small-label">CURRENT PICKER</span>
                <strong>{currentPicker.name}</strong>
              </div>

              <div className="banner-pick">Pick #1</div>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-title-row">
            <h2>Draft Board</h2>
            <span className="muted">Snake Draft</span>
          </div>

          <div className="draft-board-wrap">
            <table className="draft-board">
              <thead>
                <tr>
                  <th>Round</th>

                  {players.map((player) => (
                    <th
                      key={player.id}
                      className={
                        currentPicker?.id === player.id
                          ? "active-column"
                          : ""
                      }
                    >
                      {player.name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {[1, 2, 3, 4, 5].map((round) => (
                  <tr key={round}>
                    <td className="round-cell">{round}</td>

                    {players.map((player) => (
                      <td
                        key={player.id}
                        className={
                          currentPicker?.id === player.id
                            ? "active-column"
                            : ""
                        }
                      >
                        —
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title-row">
            <h2>Available Games</h2>
            <span className="game-count">
              {games.length} available
            </span>
          </div>

          <div className="your-turn-box">
            <strong>Review the game pool</strong>

            <span>
              Star games you are interested in before the draft begins.
            </span>
          </div>

          <div className="games-wrap">
            <table className="games-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Opponent</th>
                  <th>Date & Time</th>
                  <th>Interested</th>
                  <th>Select</th>
                </tr>
              </thead>

              <tbody>
                {games.map((game, index) => (
                  <tr key={game.id}>
                    <td>{index + 1}</td>

                    <td className="opponent">
                      {game.opponent}

                      {game.preseason && (
                        <span
                          style={{
                            marginLeft: "8px",
                            display: "inline-block",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "#c62828",
                            color: "white",
                            fontSize: "10px",
                            fontWeight: "800",
                            letterSpacing: "0.5px",
                          }}
                        >
                          PRE
                        </span>
                      )}

                      {game.cup && (
                        <span
                          style={{
                            marginLeft: "6px",
                            display: "inline-block",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "#fdb927",
                            color: "#302044",
                            fontSize: "10px",
                            fontWeight: "800",
                            letterSpacing: "0.5px",
                          }}
                        >
                          CUP
                        </span>
                      )}
                    </td>

                    <td>
                      <div>{formatDate(game.date)}</div>
                      <span className="muted">{game.time}</span>
                    </td>

                    <td>
                      <button
                        className="watch-button"
                        type="button"
                      >
                        ☆
                      </button>
                    </td>

                    <td>
                      <button
                        className="select-button"
                        disabled={!draftStarted || draftPaused}
                        type="button"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <aside className="sidebar">
        <div className="active-card">
          <span className="small-label light">ACTIVE</span>

          <h2>{currentPicker?.name || "Waiting"}</h2>

          <div className="active-subtitle">
            {draftStarted ? "Current Picker" : "Draft Not Started"}
          </div>

          <div className="timer">
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </div>

          <div className="timer-label">Pick Clock</div>
        </div>

        <div className="panel sidebar-panel">
          <div className="panel-title-row">
            <h2>Draft Order</h2>
            <span className="round-pill">Round 1</span>
          </div>

          <div className="draft-order-list">
            {players.map((player, index) => (
              <div
                key={player.id}
                className={
                  index === 0
                    ? "draft-order-row active-player"
                    : "draft-order-row"
                }
              >
                <span className="order-number">
                  {index + 1}
                </span>

                <span>{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}
