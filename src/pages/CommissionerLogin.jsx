import React from "react";

export default function CommissionerLogin({
  pin,
  setPin,
  error,
  onSubmit,
}) {
  return (
    <main className="commissioner-login">
      <form
        className="login-card"
        onSubmit={onSubmit}
      >
        <div className="commissioner-badge">
          COMMISSIONER ACCESS
        </div>

        <h2>Enter Commissioner PIN</h2>

        <p>
          Commissioner access is required to manage
          games, season members, and live draft controls.
        </p>

        <input
          className="text-input"
          type="password"
          inputMode="numeric"
          placeholder="Enter PIN"
          value={pin}
          onChange={(event) =>
            setPin(event.target.value)
          }
          autoFocus
        />

        {error && (
          <div className="error-text">
            {error}
          </div>
        )}

        <button
          className="primary-button"
          type="submit"
        >
          Unlock Commissioner
        </button>

        <div className="demo-pin">
          Commissioner PIN: 2424
        </div>
      </form>
    </main>
  );
}
