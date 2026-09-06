
import React from "react";

export default function Commissioner({
  draftOrder,
  randomizeDraftOrder,
  clockSeconds,
  setClockSeconds,
  checkInOpen,
  setCheckInOpen,
  draftStarted,
  setDraftStarted,
  draftPaused,
  setDraftPaused,
}) {
  return (
    <main className="commissioner-layout">
      <section className="commissioner-main">
        <div className="panel">
          <div className="panel-title-row">
            <h2>Draft Commissioner</h2>

            <span className="game-count">
              {draftOrder.length} members
            </span>
          </div>

          <div className="commissioner-help">
            Prepare and control the live Lakers ticket draft.
            Games and Season Members can be managed from
            their separate pages.
          </div>

          <div
            style={{
              padding: "16px",
            }}
          >
            <div className="panel">
              <div className="panel-title-row">
                <h2>Current Draft Order</h2>

                <span className="muted">
                  Snake Draft
                </span>
              </div>

              <div className="draft-order-list">
                {draftOrder.length === 0 ? (
                  <div
                    style={{
                      padding: "16px",
                      color: "#74808e",
                    }}
                  >
                    No active season members.
                  </div>
                ) : (
                  draftOrder.map((player, index) => (
                    <div
                      className="draft-order-row"
                      key={player.id}
                    >
                      <span className="order-number">
                        {index + 1}
                      </span>

                      <span>{player.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="commissioner-sidebar">
        <div className="panel">
          <div className="panel-title-row">
            <h2>Draft Controls</h2>
          </div>

          <div className="control-section">
            <label>Pick Clock</label>

            <select
              className="text-input"
              value={clockSeconds}
              onChange={(event) =>
                setClockSeconds(
                  Number(event.target.value)
                )
              }
            >
              <option value={30}>
                30 seconds
              </option>

              <option value={60}>
                1 minute
              </option>

              <option value={90}>
                1:30
              </option>

              <option value={120}>
                2 minutes
              </option>

              <option value={180}>
                3 minutes
              </option>
            </select>
          </div>

          <div className="control-section">
            <button
              className={
                checkInOpen
                  ? "control-button warning"
                  : "control-button"
              }
              onClick={() =>
                setCheckInOpen(
                  (current) => !current
                )
              }
              type="button"
            >
              {checkInOpen
                ? "Close Check-In"
                : "Open Check-In"}
            </button>

            <button
              className="control-button"
              onClick={randomizeDraftOrder}
              type="button"
              disabled={draftStarted}
            >
              Randomize Draft Order
            </button>

            {!draftStarted ? (
              <button
                className="control-button start"
                onClick={() => {
                  setDraftStarted(true);
                  setDraftPaused(false);
                }}
                type="button"
              >
                Start Draft
              </button>
            ) : (
              <button
                className="control-button warning"
                onClick={() =>
                  setDraftPaused(
                    (current) => !current
                  )
                }
                type="button"
              >
                {draftPaused
                  ? "Resume Draft"
                  : "Pause Draft"}
              </button>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title-row">
            <h2>Draft Status</h2>
          </div>

          <div className="control-section">
            <div
              style={{
                marginBottom: "12px",
              }}
            >
              <span className="muted">
                Check-In
              </span>

              <div
                style={{
                  fontWeight: "700",
                  marginTop: "3px",
                }}
              >
                {checkInOpen
                  ? "Open"
                  : "Closed"}
              </div>
            </div>

            <div>
              <span className="muted">
                Draft
              </span>

              <div
                style={{
                  fontWeight: "700",
                  marginTop: "3px",
                }}
              >
                {!draftStarted
                  ? "Not Started"
                  : draftPaused
                  ? "Paused"
                  : "Live"}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
