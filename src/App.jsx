import React, { useMemo, useState } from "react";
import "./styles.css";

import { startingGames, startingMembers } from "./data/seasonData";

import DraftRoom from "./pages/DraftRoom";
import GamesPage from "./pages/GamesPage";
import SeasonMembersPage from "./pages/SeasonMembersPage";
import Commissioner from "./pages/Commissioner";
import CommissionerLogin from "./pages/CommissionerLogin";

export default function App() {
  const [page, setPage] = useState("draft");

  const [players, setPlayers] = useState(startingMembers);
  const [games, setGames] = useState(startingGames);

  const [draftOrder, setDraftOrder] = useState(
    startingMembers.filter((player) => player.status === "active")
  );

  const [commissionerUnlocked, setCommissionerUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const [draftStarted, setDraftStarted] = useState(false);
  const [draftPaused, setDraftPaused] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);

  const [clockSeconds, setClockSeconds] = useState(90);

  const [newPlayer, setNewPlayer] = useState("");

  const [newGame, setNewGame] = useState({
    opponent: "",
    date: "",
    time: "7:00 PM",
  });

  const [selectedGames, setSelectedGames] = useState([]);

  const draftGames = useMemo(
    () => games.filter((game) => game.status === "draft"),
    [games]
  );

  const currentPicker = draftOrder[0];

  function unlockCommissioner(event) {
    event.preventDefault();

    if (pin === "2424") {
      setCommissionerUnlocked(true);
      setPin("");
      setPinError("");
    } else {
      setPinError("Incorrect Commissioner PIN.");
    }
  }

  function updateGameStatus(id, status) {
    setGames((currentGames) =>
      currentGames.map((game) =>
        game.id === id ? { ...game, status } : game
      )
    );
  }

  function updateGameIndicator(id, indicator, checked) {
    setGames((currentGames) =>
      currentGames.map((game) =>
        game.id === id
          ? {
              ...game,
              [indicator]: checked,
            }
          : game
      )
    );
  }

  function addGame(event) {
    event.preventDefault();

    if (!newGame.opponent.trim() || !newGame.date) {
      return;
    }

    const game = {
      id: Date.now(),
      opponent: newGame.opponent.trim(),
      date: newGame.date,
      time: newGame.time,
      status: "draft",
      preseason: false,
      cup: false,
    };

    setGames((currentGames) => [...currentGames, game]);

    setNewGame({
      opponent: "",
      date: "",
      time: "7:00 PM",
    });
  }

  function deleteGame(id) {
    setGames((currentGames) =>
      currentGames.filter((game) => game.id !== id)
    );

    setSelectedGames((current) =>
      current.filter((gameId) => gameId !== id)
    );
  }

  function toggleGameSelection(id) {
    setSelectedGames((current) =>
      current.includes(id)
        ? current.filter((gameId) => gameId !== id)
        : [...current, id]
    );
  }

  function toggleAllGames() {
    if (
      games.length > 0 &&
      selectedGames.length === games.length
    ) {
      setSelectedGames([]);
    } else {
      setSelectedGames(games.map((game) => game.id));
    }
  }

  function bulkStatus(status) {
    setGames((currentGames) =>
      currentGames.map((game) =>
        selectedGames.includes(game.id)
          ? { ...game, status }
          : game
      )
    );

    setSelectedGames([]);
  }

  function addPlayer(event) {
    event.preventDefault();

    const cleanedName = newPlayer.trim();

    if (!cleanedName) return;

    const player = {
      id: Date.now(),
      name: cleanedName,
      status: "active",
    };

    setPlayers((current) => [...current, player]);

    setDraftOrder((current) => [...current, player]);

    setNewPlayer("");
  }

  function removePlayer(id) {
    setPlayers((current) =>
      current.filter((player) => player.id !== id)
    );

    setDraftOrder((current) =>
      current.filter((player) => player.id !== id)
    );
  }

  function updatePlayerStatus(id, status) {
    const player = players.find((item) => item.id === id);

    setPlayers((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );

    if (!player) return;

    if (status === "active") {
      setDraftOrder((current) => {
        const alreadyIncluded = current.some(
          (item) => item.id === id
        );

        if (alreadyIncluded) {
          return current;
        }

        return [
          ...current,
          {
            ...player,
            status: "active",
          },
        ];
      });
    } else {
      setDraftOrder((current) =>
        current.filter((item) => item.id !== id)
      );
    }
  }

  function randomizeDraftOrder() {
    const randomized = players.filter(
      (player) => player.status === "active"
    );

    for (let i = randomized.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));

      [randomized[i], randomized[j]] = [
        randomized[j],
        randomized[i],
      ];
    }

    setDraftOrder(randomized);
  }

  function commissionerLogin() {
    return (
      <CommissionerLogin
        pin={pin}
        setPin={setPin}
        error={pinError}
        onSubmit={unlockCommissioner}
      />
    );
  }

  function renderPage() {
    if (page === "draft") {
      return (
        <DraftRoom
          players={draftOrder}
          currentPicker={currentPicker}
          games={draftGames}
          draftStarted={draftStarted}
          draftPaused={draftPaused}
          checkInOpen={checkInOpen}
          clockSeconds={clockSeconds}
        />
      );
    }

    if (page === "games") {
      if (!commissionerUnlocked) {
        return commissionerLogin();
      }

      return (
        <GamesPage
          games={games}
          selectedGames={selectedGames}
          toggleGameSelection={toggleGameSelection}
          toggleAllGames={toggleAllGames}
          bulkStatus={bulkStatus}
          updateGameStatus={updateGameStatus}
          updateGameIndicator={updateGameIndicator}
          deleteGame={deleteGame}
          newGame={newGame}
          setNewGame={setNewGame}
          addGame={addGame}
        />
      );
    }

    if (page === "members") {
      if (!commissionerUnlocked) {
        return commissionerLogin();
      }

      return (
        <SeasonMembersPage
          players={players}
          newPlayer={newPlayer}
          setNewPlayer={setNewPlayer}
          addPlayer={addPlayer}
          removePlayer={removePlayer}
          updatePlayerStatus={updatePlayerStatus}
        />
      );
    }

    if (page === "commissioner") {
      if (!commissionerUnlocked) {
        return commissionerLogin();
      }

      return (
        <Commissioner
          draftOrder={draftOrder}
          randomizeDraftOrder={randomizeDraftOrder}
          clockSeconds={clockSeconds}
          setClockSeconds={setClockSeconds}
          checkInOpen={checkInOpen}
          setCheckInOpen={setCheckInOpen}
          draftStarted={draftStarted}
          setDraftStarted={setDraftStarted}
          draftPaused={draftPaused}
          setDraftPaused={setDraftPaused}
        />
      );
    }

    return null;
  }

  return (
    <div className="app-shell">
      <header className="top-header">
        <div>
          <div className="eyebrow">
            LAKERS SEASON TICKETS
          </div>

          <h1>Draft Room</h1>
        </div>

        <nav className="top-nav">
          <button
            className={
              page === "draft"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setPage("draft")}
            type="button"
          >
            Draft Room
          </button>

          <button
            className={
              page === "games"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setPage("games")}
            type="button"
          >
            Games
          </button>

          <button
            className={
              page === "members"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setPage("members")}
            type="button"
          >
            Season Members
          </button>

          <button
            className={
              page === "commissioner"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setPage("commissioner")}
            type="button"
          >
            Commissioner
          </button>
        </nav>
      </header>

      {renderPage()}
    </div>
  );
}
