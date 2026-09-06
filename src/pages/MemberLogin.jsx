import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export default function MemberLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function signIn(event) {
    event.preventDefault();
    setWorking(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    setError(result.error?.message || "");
    setWorking(false);
  }

  return (
    <main className="commissioner-login">
      <form className="login-card" onSubmit={signIn}>
        <div className="commissioner-badge">SEASON MEMBER ACCESS</div>
        <h2>Sign In</h2>
        <p>Sign in to enter the Draft Room and view your selected games.</p>
        <input className="text-input" type="email" placeholder="Email" value={email}
          onChange={(event) => setEmail(event.target.value)} required />
        <input className="text-input" type="password" placeholder="Password" value={password}
          onChange={(event) => setPassword(event.target.value)} required />
        {error && <div className="error-text">{error}</div>}
        <button className="primary-button" type="submit" disabled={working}>
          {working ? "Signing In…" : "Sign In"}
        </button>
      </form>
    </main>
  );
}

