import React, { useEffect, useState } from "react";
import "./styles.css";
import Commissioner from "./pages/Commissioner";
import CommissionerLogin from "./pages/CommissionerLogin";
import DraftRoom from "./pages/DraftRoom";
import GamesPage from "./pages/GamesPage";
import MemberLogin from "./pages/MemberLogin";
import MyGames from "./pages/MyGames";
import SeasonMembersPage from "./pages/SeasonMembersPage";
import useLakersData from "./hooks/useLakersData";
import { supabase, supabaseConfigured } from "./lib/supabase";

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [page, setPage] = useState("draft");
  const [mode, setMode] = useState("real");
  const [commissionerUnlocked, setCommissionerUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [newPlayer, setNewPlayer] = useState("");
  const [newGame, setNewGame] = useState({ opponent: "", date: "", time: "7:00 PM" });
  const [selectedGames, setSelectedGames] = useState([]);
  const draft = useLakersData(session, mode);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCommissionerUnlocked(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const isCommissioner = draft.profile?.role === "commissioner";

  function unlockCommissioner(event) {
    event.preventDefault();
    if (pin === "2424" && isCommissioner) {
      setCommissionerUnlocked(true);
      setPin("");
      setPinError("");
    } else {
      setPinError("Incorrect Commissioner credentials.");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPage("draft");
  }

  async function addGame(event) {
    event.preventDefault();
    if (!newGame.opponent.trim() || !newGame.date) return;
    const { error } = await supabase.from("lakers_games").insert({ season_id: draft.season.id,
      opponent: newGame.opponent.trim(), game_date: newGame.date, game_time: newGame.time,
      status: "draft", preseason: false, cup: false });
    if (error) return window.alert(error.message);
    setNewGame({ opponent: "", date: "", time: "7:00 PM" });
    await draft.refresh();
  }

  async function updateGame(id, values) {
    const { error } = await supabase.from("lakers_games").update(values).eq("id", id);
    if (error) return window.alert(error.message);
    await draft.refresh();
  }

  async function deleteGame(id) {
    if (!window.confirm("Delete this game from the inventory?")) return;
    const { error } = await supabase.from("lakers_games").delete().eq("id", id);
    if (error) return window.alert(error.message);
    setSelectedGames((current) => current.filter((gameId) => gameId !== id));
    await draft.refresh();
  }

  async function bulkStatus(status) {
    const { error } = await supabase.from("lakers_games").update({ status }).in("id", selectedGames);
    if (error) return window.alert(error.message);
    setSelectedGames([]);
    await draft.refresh();
  }

  async function addPlayer(event) {
    event.preventDefault();
    if (!newPlayer.trim()) return;
    const { error } = await supabase.from("lakers_season_members").insert({ season_id: draft.season.id,
      name: newPlayer.trim(), status: "active", games_allowed: 5 });
    if (error) return window.alert(error.message);
    setNewPlayer("");
    await draft.refresh();
  }

  async function updatePlayerStatus(id, status) {
    const { error } = await supabase.from("lakers_season_members").update({ status }).eq("id", id);
    if (error) return window.alert(error.message);
    await draft.refresh();
  }

  async function removePlayer(id) {
    if (!window.confirm("Remove this season member?")) return;
    const { error } = await supabase.from("lakers_season_members").delete().eq("id", id);
    if (error) return window.alert(error.message);
    await draft.refresh();
  }

  function toggleGameSelection(id) {
    setSelectedGames((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  if (!supabaseConfigured) return <main className="commissioner-login"><div className="login-card"><div className="commissioner-badge">SETUP REQUIRED</div><h2>Connect Supabase</h2><p>Add the approved Lakers Draft Room values to the local environment file before signing in.</p></div></main>;
  if (!authReady) return <main className="loading-state">Loading…</main>;
  if (!session) return <MemberLogin />;
  if (draft.loading && !draft.season) return <main className="loading-state">Loading Draft Room…</main>;
  if (draft.error) return <main className="commissioner-login"><div className="login-card"><h2>Draft Room unavailable</h2><div className="error-text">{draft.error}</div><button className="primary-button" onClick={draft.refresh}>Try Again</button></div></main>;

  const needsCommissionerPin = ["games", "members", "commissioner"].includes(page) && isCommissioner && !commissionerUnlocked;

  return <div className="app-shell">
    <header className="top-header">
      <div><div className="eyebrow">LAKERS SEASON TICKETS</div><h1>Draft Room</h1></div>
      <nav className="top-nav">
        <button className={page === "draft" ? "nav-button active" : "nav-button"} onClick={() => setPage("draft")}>Draft Room</button>
        {draft.member && <button className={page === "my-games" ? "nav-button active" : "nav-button"} onClick={() => setPage("my-games")}>My Games</button>}
        {isCommissioner && <>
          <button className={page === "games" ? "nav-button active" : "nav-button"} onClick={() => setPage("games")}>Games</button>
          <button className={page === "members" ? "nav-button active" : "nav-button"} onClick={() => setPage("members")}>Season Members</button>
          <button className={page === "commissioner" ? "nav-button active" : "nav-button"} onClick={() => setPage("commissioner")}>Commissioner</button>
        </>}
        <button className="nav-button" onClick={signOut}>Log Out</button>
      </nav>
    </header>
    {needsCommissionerPin ? <CommissionerLogin pin={pin} setPin={setPin} error={pinError} onSubmit={unlockCommissioner} /> :
      page === "draft" ? <DraftRoom {...draft} isCommissioner={isCommissioner} mode={mode} /> :
      page === "my-games" ? <MyGames member={draft.member} picks={draft.picks} /> :
      page === "games" && isCommissioner ? <GamesPage games={draft.games} selectedGames={selectedGames}
        toggleGameSelection={toggleGameSelection} toggleAllGames={() => setSelectedGames(selectedGames.length === draft.games.length ? [] : draft.games.map((game) => game.id))}
        bulkStatus={bulkStatus} updateGameStatus={(id, status) => updateGame(id, { status })}
        updateGameIndicator={(id, indicator, checked) => updateGame(id, { [indicator]: checked })}
        deleteGame={deleteGame} newGame={newGame} setNewGame={setNewGame} addGame={addGame} /> :
      page === "members" && isCommissioner ? <SeasonMembersPage players={draft.members} newPlayer={newPlayer} setNewPlayer={setNewPlayer}
        addPlayer={addPlayer} removePlayer={removePlayer} updatePlayerStatus={updatePlayerStatus} /> :
      page === "commissioner" && isCommissioner ? <Commissioner {...draft} mode={mode} setMode={setMode} /> :
      <DraftRoom {...draft} isCommissioner={isCommissioner} mode={mode} />}
  </div>;
}
