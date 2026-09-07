import React, { useEffect, useRef, useState } from "react";
import "./styles.css";
import Commissioner from "./pages/Commissioner";
import DraftRoom from "./pages/DraftRoom";
import GamesPage from "./pages/GamesPage";
import MemberLogin from "./pages/MemberLogin";
import MyGames from "./pages/MyGames";
import SeasonMembersPage from "./pages/SeasonMembersPage";
import useLakersData from "./hooks/useLakersData";
import { didAuthenticatedUserChange, resolvePermittedPage } from "./lib/accessControl";
import { supabase, supabaseConfigured } from "./lib/supabase";

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [page, setPage] = useState("draft");
  const [mode, setMode] = useState("real");
  const [newPlayer, setNewPlayer] = useState("");
  const [newGame, setNewGame] = useState({ opponent: "", date: "", time: "7:00 PM" });
  const [selectedGames, setSelectedGames] = useState([]);
  const sessionUserId = useRef(null);
  const draft = useLakersData(identity ? session : null, mode, identity);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      sessionUserId.current = data.session?.user?.id || null;
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user?.id || null;
      const userChanged = didAuthenticatedUserChange(sessionUserId.current, nextUserId);
      sessionUserId.current = nextUserId;
      setSession(nextSession);
      if (userChanged) {
        setIdentity(null);
        setIdentityReady(!nextSession);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadIdentity() {
    const { data, error } = await supabase.rpc("lakers_current_identity");
    setIdentity(error ? null : data?.[0] || null);
    setIdentityReady(true);
  }

  useEffect(() => {
    if (session?.user) loadIdentity();
    else setIdentityReady(true);
  }, [session?.user?.id]);

  const isCommissioner = identity?.identity_role === "commissioner";
  const permittedPage = resolvePermittedPage(page, isCommissioner);

  function requireCommissioner() {
    if (!isCommissioner) throw new Error("Commissioner authorization required");
  }

  async function signOut() {
    if (identity?.identity_role === "member") {
      await supabase.rpc("lakers_member_logout");
    }
    await supabase.auth.signOut();
    setIdentity(null);
    setPage("draft");
  }

  async function addGame(event) {
    event.preventDefault();
    requireCommissioner();
    if (!newGame.opponent.trim() || !newGame.date) return;
    const { error } = await supabase.from("lakers_games").insert({ season_id: draft.season.id,
      opponent: newGame.opponent.trim(), game_date: newGame.date, game_time: newGame.time,
      status: "draft", preseason: false, cup: false });
    if (error) return window.alert(error.message);
    setNewGame({ opponent: "", date: "", time: "7:00 PM" });
    await draft.refresh();
  }

  async function updateGame(id, values) {
    requireCommissioner();
    const { error } = await supabase.from("lakers_games").update(values).eq("id", id);
    if (error) return window.alert(error.message);
    await draft.refresh();
  }

  async function deleteGame(id) {
    requireCommissioner();
    if (!window.confirm("Delete this game from the inventory?")) return;
    const { error } = await supabase.from("lakers_games").delete().eq("id", id);
    if (error) return window.alert(error.message);
    setSelectedGames((current) => current.filter((gameId) => gameId !== id));
    await draft.refresh();
  }

  async function bulkStatus(status) {
    requireCommissioner();
    const { error } = await supabase.from("lakers_games").update({ status }).in("id", selectedGames);
    if (error) return window.alert(error.message);
    setSelectedGames([]);
    await draft.refresh();
  }

  async function addPlayer(event) {
    event.preventDefault();
    requireCommissioner();
    if (!newPlayer.trim()) return;
    try {
      await draft.addMember(newPlayer.trim());
      setNewPlayer("");
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function updatePlayerStatus(id, status) {
    requireCommissioner();
    try {
      await draft.setMemberStatus(id, status);
    } catch (error) {
      window.alert(error.message);
    }
  }

  function toggleGameSelection(id) {
    setSelectedGames((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  if (!supabaseConfigured) return <main className="commissioner-login"><div className="login-card"><div className="commissioner-badge">SETUP REQUIRED</div><h2>Connect Supabase</h2><p>Add the approved Lakers Draft Room values to the local environment file before signing in.</p></div></main>;
  if (!authReady || (session && !identityReady)) return <main className="loading-state">Loading…</main>;
  if (!session || !identity) return <MemberLogin session={session} onLogin={loadIdentity} />;
  if (draft.loading && !draft.season) return <main className="loading-state">Loading Draft Room…</main>;
  if (draft.error) return <main className="commissioner-login"><div className="login-card"><h2>Draft Room unavailable</h2><div className="error-text">{draft.error}</div><button className="primary-button" onClick={draft.refresh}>Try Again</button></div></main>;

  return <div className="app-shell">
    <header className="top-header">
      <div><div className="eyebrow">LAKERS SEASON TICKETS</div><h1>Draft Room</h1></div>
      <nav className="top-nav">
        <button className={permittedPage === "draft" ? "nav-button active" : "nav-button"} onClick={() => setPage("draft")}>Draft Room</button>
        {draft.member && <button className={permittedPage === "my-games" ? "nav-button active" : "nav-button"} onClick={() => setPage("my-games")}>My Draft Board</button>}
        {isCommissioner && <>
          <button className={permittedPage === "games" ? "nav-button active" : "nav-button"} onClick={() => setPage("games")}>Games</button>
          <button className={permittedPage === "members" ? "nav-button active" : "nav-button"} onClick={() => setPage("members")}>Season Members</button>
          <button className={permittedPage === "commissioner" ? "nav-button active" : "nav-button"} onClick={() => setPage("commissioner")}>Commissioner</button>
        </>}
        <button className="nav-button" onClick={signOut}>Log Out</button>
      </nav>
    </header>
    {permittedPage === "draft" ? <DraftRoom {...draft} isCommissioner={isCommissioner} mode={mode} /> :
      permittedPage === "my-games" ? <MyGames member={draft.member} games={draft.games} picks={draft.picks}
        preferences={draft.preferences} run={draft.run} mode={mode} isCommissioner={isCommissioner}
        makePick={draft.makePick} setPreference={draft.setPreference} paymentSummary={draft.paymentSummary} /> :
      permittedPage === "games" && isCommissioner ? <GamesPage games={draft.games} selectedGames={selectedGames}
        toggleGameSelection={toggleGameSelection} toggleAllGames={() => setSelectedGames(selectedGames.length === draft.games.length ? [] : draft.games.map((game) => game.id))}
        bulkStatus={bulkStatus} updateGameStatus={(id, status) => updateGame(id, { status })}
        updateGameIndicator={(id, indicator, checked) => updateGame(id, { [indicator]: checked })}
        deleteGame={deleteGame} newGame={newGame} setNewGame={setNewGame} addGame={addGame} /> :
      permittedPage === "members" && isCommissioner ? <SeasonMembersPage players={draft.members} newPlayer={newPlayer} setNewPlayer={setNewPlayer}
        addPlayer={addPlayer} updatePlayerStatus={updatePlayerStatus} /> :
      permittedPage === "commissioner" && isCommissioner ? <Commissioner {...draft} mode={mode} setMode={setMode} /> :
      <DraftRoom {...draft} isCommissioner={isCommissioner} mode={mode} />}
  </div>;
}
