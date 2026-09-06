import React from "react";
import { formatDate } from "../data/seasonData";

export default function GamesPage({
  games,
  selectedGames,
  toggleGameSelection,
  toggleAllGames,
  bulkStatus,
  updateGameStatus,
  updateGameIndicator,
  deleteGame,
  newGame,
  setNewGame,
  addGame,
}) {
  const draftCount = games.filter(
    (game) => game.status === "draft"
  ).length;

  const keepCount = games.filter(
    (game) => game.status === "keep"
  ).length;

  const unavailableCount = games.filter(
    (game) => game.status === "not-owned"
  ).length;

  return (
    <main className="commissioner-layout">
      <section
        className="commissioner-main"
        style={{ gridColumn: "1 / -1" }}
      >
        <div className="panel">
          <div className="panel-title-row">
            <h2>2026–27 Season Ticket Games</h2>

            <span className="game-count">
              {draftCount} in draft
            </span>
          </div>

          <div className="commissioner-help">
            Manage your Lakers season ticket inventory.
            Choose which games go into the draft,
            which games you want to keep,
            and which games are not available.
          </div>

          <form
            className="add-game-form"
            onSubmit={addGame}
          >
            <input
              className="text-input"
              placeholder="Opponent"
              value={newGame.opponent}
              onChange={(event) =>
                setNewGame({
                  ...newGame,
                  opponent: event.target.value,
                })
              }
            />

            <input
              className="text-input"
              type="date"
              value={newGame.date}
              onChange={(event) =>
                setNewGame({
                  ...newGame,
                  date: event.target.value,
                })
              }
            />

            <select
              className="text-input"
              value={newGame.time}
              onChange={(event) =>
                setNewGame({
                  ...newGame,
                  time: event.target.value,
                })
              }
            >
              <option>2:00 PM</option>
              <option>5:30 PM</option>
              <option>6:00 PM</option>
              <option>6:30 PM</option>
              <option>7:00 PM</option>
              <option>7:30 PM</option>
              <option>8:00 PM</option>
            </select>

            <button
              className="primary-button small"
              type="submit"
            >
              + Add Game
            </button>
          </form>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              padding: "0 16px 14px",
            }}
          >
            <span className="muted">
              Total: <strong>{games.length}</strong>
            </span>

            <span className="muted">
              In Draft: <strong>{draftCount}</strong>
            </span>

            <span className="muted">
              Keep: <strong>{keepCount}</strong>
            </span>

            <span className="muted">
              Not Available:{" "}
              <strong>{unavailableCount}</strong>
            </span>
          </div>

          {selectedGames.length > 0 && (
            <div className="bulk-bar">
              <strong>
                {selectedGames.length} selected
              </strong>

              <button
                type="button"
                onClick={() => bulkStatus("draft")}
              >
                Put In Draft
              </button>

              <button
                type="button"
                onClick={() => bulkStatus("keep")}
              >
                Keep
              </button>

              <button
                type="button"
                onClick={() =>
                  bulkStatus("not-owned")
                }
              >
                Not Available
              </button>
            </div>
          )}

          <div className="games-wrap">
            <table className="games-table commissioner-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        games.length > 0 &&
                        selectedGames.length ===
                          games.length
                      }
                      onChange={toggleAllGames}
                    />
                  </th>

                  <th>Opponent</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Pre</th>
                  <th>Cup</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {games.map((game) => (
                  <tr key={game.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedGames.includes(
                          game.id
                        )}
                        onChange={() =>
                          toggleGameSelection(game.id)
                        }
                      />
                    </td>

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

                    <td>{formatDate(game.date)}</td>

                    <td>{game.time}</td>

                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(game.preseason)}
                        onChange={(event) =>
                          updateGameIndicator(
                            game.id,
                            "preseason",
                            event.target.checked
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(game.cup)}
                        onChange={(event) =>
                          updateGameIndicator(
                            game.id,
                            "cup",
                            event.target.checked
                          )
                        }
                      />
                    </td>

                    <td>
                      <select
                        className={`status-select status-${game.status}`}
                        value={game.status}
                        onChange={(event) =>
                          updateGameStatus(
                            game.id,
                            event.target.value
                          )
                        }
                      >
                        <option value="draft">
                          In Draft
                        </option>

                        <option value="keep">
                          Keep
                        </option>

                        <option value="not-owned">
                          Not Available
                        </option>
                      </select>
                    </td>

                    <td>
                      <button
                        className="delete-button"
                        type="button"
                        onClick={() =>
                          deleteGame(game.id)
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
