import React from "react";

export default function SeasonMembersPage({
  players,
  newPlayer,
  setNewPlayer,
  addPlayer,
  updatePlayerStatus,
}) {
  const activeCount = players.filter(
    (player) => player.status === "active"
  ).length;

  const pendingCount = players.filter(
    (player) => player.status === "pending"
  ).length;

  const inactiveCount = players.filter(
    (player) => player.status === "inactive"
  ).length;

  return (
    <main className="commissioner-layout">
      <section
        className="commissioner-main"
        style={{ gridColumn: "1 / -1" }}
      >
        <div className="panel">
          <div className="panel-title-row">
            <h2>Season Ticket Members</h2>

            <span className="game-count">
              {activeCount} active
            </span>
          </div>

          <div className="commissioner-help">
            Manage the people sharing the Lakers season
            tickets. Only Active members are included
            when the Commissioner randomizes the draft order.
          </div>

          <form
            className="player-form"
            onSubmit={addPlayer}
          >
            <input
              className="text-input"
              placeholder="Member name"
              value={newPlayer}
              onChange={(event) =>
                setNewPlayer(event.target.value)
              }
            />

            <button
              className="primary-button small"
              type="submit"
            >
              + Add Member
            </button>
          </form>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              padding: "0 14px 14px",
            }}
          >
            <span className="muted">
              Total: <strong>{players.length}</strong>
            </span>

            <span className="muted">
              Active: <strong>{activeCount}</strong>
            </span>

            <span className="muted">
              Pending: <strong>{pendingCount}</strong>
            </span>

            <span className="muted">
              Inactive: <strong>{inactiveCount}</strong>
            </span>
          </div>

          <div className="games-wrap">
            <table className="games-table commissioner-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Status</th>
                  <th>Draft Eligible</th>
                </tr>
              </thead>

              <tbody>
                {players.map((player) => (
                  <tr key={player.id}>
                    <td className="opponent">
                      {player.name}
                    </td>

                    <td>
                      <select
                        className="text-input"
                        value={player.status || "active"}
                        onChange={(event) =>
                          updatePlayerStatus(
                            player.id,
                            event.target.value
                          )
                        }
                      >
                        <option value="active">
                          Active
                        </option>

                        <option value="inactive">
                          Inactive
                        </option>
                      </select>
                    </td>

                    <td>
                      {(player.status || "active") === "active"
                        ? "Yes"
                        : "No"}
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
