import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { isValidMemberPin, normalizeMemberPin, preserveSelectedMemberId } from "../lib/memberPin";

export default function MemberLogin({ session, onLogin }) {
  const [accessCode, setAccessCode] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const selectedMember = useMemo(
    () => members.find((member) => member.member_id === memberId) || null,
    [members, memberId]
  );

  async function loadMembers() {
    const result = await supabase.rpc("lakers_member_login_options");
    if (result.error) throw result.error;
    const availableMembers = result.data || [];
    setMembers(availableMembers);
    setMemberId((currentMemberId) => preserveSelectedMemberId(availableMembers, currentMemberId));
  }

  async function ensureAnonymousDeviceSession() {
    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;

    let currentSession = sessionResult.data.session;
    if (!currentSession?.user?.is_anonymous) {
      if (currentSession) await supabase.auth.signOut();
      const anonymousResult = await supabase.auth.signInAnonymously();
      if (anonymousResult.error) throw anonymousResult.error;
      currentSession = anonymousResult.data.session;
    }

    if (!currentSession?.access_token) {
      throw new Error("Unable to create a secure device session. Please try again.");
    }

    return currentSession;
  }

  useEffect(() => {
    async function prepareDevice() {
      setCheckingSession(true);
      let currentSession;
      try {
        currentSession = await ensureAnonymousDeviceSession();
      } catch (caught) {
        setError(caught.message);
        setCheckingSession(false);
        return;
      }
      if (currentSession) {
        const accessResult = await supabase.rpc("lakers_has_season_access");
        if (!accessResult.error && accessResult.data) {
          setAccessGranted(true);
          try { await loadMembers(); } catch (caught) { setError(caught.message); }
        }
      }
      setCheckingSession(false);
    }
    prepareDevice();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!accessGranted) return undefined;
    const refreshMembers = () => loadMembers().catch((caught) => setError(caught.message));
    const timer = window.setInterval(refreshMembers, 5000);
    window.addEventListener("focus", refreshMembers);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshMembers);
    };
  }, [accessGranted]);

  async function verifyAccessCode(event) {
    event.preventDefault();
    setWorking(true);
    setError("");
    let result;
    try {
      await ensureAnonymousDeviceSession();
      result = await supabase.rpc("lakers_verify_season_access_code", {
        requested_code: accessCode,
      });
    } catch (caught) {
      result = { error: caught };
    }
    if (result.error) setError(result.error.message);
    else {
      setAccessCode("");
      setAccessGranted(true);
      try { await loadMembers(); } catch (caught) { setError(caught.message); }
    }
    setWorking(false);
  }

  async function memberSignIn(event) {
    event.preventDefault();
    setWorking(true);
    setError("");
    const functionName = selectedMember?.pin_configured
      ? "lakers_verify_member_pin"
      : "lakers_create_member_pin";
    const parameters = selectedMember?.pin_configured
      ? { requested_member_id: memberId, requested_pin: pin }
      : { requested_member_id: memberId, requested_pin: pin,
          requested_pin_confirmation: pinConfirmation };
    const result = await supabase.rpc(functionName, parameters);
    if (result.error) setError(result.error.message);
    else {
      setPin("");
      setPinConfirmation("");
      await onLogin();
    }
    setWorking(false);
  }

  if (checkingSession) return <main className="loading-state">Preparing secure access…</main>;

  return <main className="commissioner-login">
    <div className="login-card">
      <div className="commissioner-badge">LAKERS SEASON TICKETS</div>
      {!accessGranted ? <form onSubmit={verifyAccessCode}>
        <h2>Season Ticket Member Sign In</h2>
        <p>Enter the private Season Access Code to continue.</p>
        <label className="login-field-label" htmlFor="season-access-code">Season Access Code</label>
        <input id="season-access-code" className="text-input" type="password"
          autoComplete="off" placeholder="Enter access code" value={accessCode}
          onChange={(event) => setAccessCode(event.target.value)} required />
        {error && <div className="error-text">{error}</div>}
        <button className="primary-button" type="submit" disabled={working || accessCode.length < 4}>
          {working ? "Checking…" : "Continue"}
        </button>
      </form> : <form onSubmit={memberSignIn}>
        <h2>Season Ticket Member Sign In</h2>
        <p>Choose your name and {selectedMember?.pin_configured ? "enter your personal PIN." : "create your personal PIN."}</p>
        <label className="login-field-label" htmlFor="member-account">Your Name</label>
        <select id="member-account" className="text-input" value={memberId}
          onChange={(event) => { setMemberId(event.target.value); setPin(""); setPinConfirmation(""); setError(""); }} required>
          {members.map((member) => <option key={member.member_id} value={member.member_id}>{member.member_name}</option>)}
        </select>
        <label className="login-field-label" htmlFor="member-pin">
          {selectedMember?.pin_configured ? "4-Digit PIN" : "Create a 4-Digit PIN"}
        </label>
        <input id="member-pin" className="text-input" type="password" inputMode="numeric"
          pattern="[0-9]{4}" maxLength="4" autoComplete="one-time-code"
          placeholder="Enter PIN" value={pin}
          onChange={(event) => setPin(normalizeMemberPin(event.target.value))} required />
        {!selectedMember?.pin_configured && <>
          <label className="login-field-label" htmlFor="confirm-member-pin">Confirm PIN</label>
          <input id="confirm-member-pin" className="text-input" type="password" inputMode="numeric"
            pattern="[0-9]{4}" maxLength="4" autoComplete="one-time-code"
            placeholder="Enter PIN again" value={pinConfirmation}
            onChange={(event) => setPinConfirmation(normalizeMemberPin(event.target.value))} required />
        </>}
        {error && <div className="error-text">{error}</div>}
        <button className="primary-button" type="submit"
          disabled={working || !memberId || !isValidMemberPin(pin) || (!selectedMember?.pin_configured && pin !== pinConfirmation)}>
          {working ? "Signing In…" : selectedMember?.pin_configured ? "Enter Draft Room" : "Create PIN & Enter"}
        </button>
      </form>}
    </div>
  </main>;
}
