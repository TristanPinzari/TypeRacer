import Racetrack from "./Racetrack";
import Typer from "./Typer";

import { useState, useCallback, useEffect } from "react";

import { IoIosSpeedometer } from "react-icons/io";
import { MdTimer } from "react-icons/md";
import { AiOutlineAim } from "react-icons/ai";
import LoadingScreen from "./LoadingScreen";
import type { gameText, pulse } from "../assets/interfaces";
import { functions } from "../lib/appwrite";

function addPlayerToRows() {
  return functions.createExecution({
    functionId: import.meta.env.VITE_APPWRITE_FUNC_PLAYER_MANAGER,
    body: JSON.stringify({
      action: "addPlayerToRows",
    }),
  });
}

function removePlayerFromRows(playerId: string) {
  return functions.createExecution({
    functionId: import.meta.env.VITE_APPWRITE_FUNC_PLAYER_MANAGER,
    body: JSON.stringify({
      action: "removePlayerFromRows",
      data: { playerId: playerId },
    }),
    async: true,
  });
}

function updatePlayerStatus(playerId: string, newStatus: string) {
  return functions.createExecution({
    functionId: import.meta.env.VITE_APPWRITE_FUNC_PLAYER_MANAGER,
    body: JSON.stringify({
      action: "updatePlayerStatus",
      data: { playerId: playerId, newStatus: newStatus },
    }),
  });
}

function PublicRace({ navigate }: { navigate: (location: string) => void }) {
  const [playerId, setPlayerId] = useState(null);
  const [pageState, setPageState] = useState("loading");
  const [liveValues, setLiveValues] = useState({ wpm: 0, progress: 0 });
  const [finalValues, setFinalValues] = useState<pulse>();
  const [roundCount, setRoundCount] = useState(0);
  const [gameActive, setGameActive] = useState(true);
  const [gameText, setGameText] = useState<gameText>({
    content: "ye.",
    origin: "",
    author: "",
    uploader: "",
    type: "",
  });

  const handlePulse = useCallback((stats: pulse) => {
    setLiveValues(stats);
    if (stats.progress == 1) {
      setGameActive(false);
      setFinalValues(stats);
    }
  }, []);

  function resetGame() {
    setRoundCount((prev) => prev + 1);
    setGameActive(true);
  }

  const joinRace = useCallback(async () => {
    if (playerId) {
      try {
        const response = await updatePlayerStatus(playerId, "searching");
        if (response.status === "completed") {
          const reponseBody = JSON.parse(response.responseBody);
          if (reponseBody.error) {
            console.error("Function error:", reponseBody.error);
            setPageState("failed");
          } else {
            console.log(reponseBody);
          }
        } else {
          setPageState("failed");
        }
      } catch (error) {
        console.error("Function execution failed:", error);
        setPageState("failed");
      }
    } else {
      console.error("Tried to join race without a playerId");
      setPageState("failed");
    }
  }, [playerId]);

  // Generate an playerId for player, if didn't get the playerId switch to failed loadingscreen
  useEffect(() => {
    (async () => {
      try {
        const response = await addPlayerToRows();
        if (response.status === "completed") {
          const reponseBody = JSON.parse(response.responseBody);
          if (reponseBody.playerId) {
            setPlayerId(reponseBody.playerId);
          } else {
            console.error("Function error:", reponseBody.error);
            setPageState("failed");
          }
        }
      } catch (error) {
        console.error("Function execution failed:", error);
        setPageState("failed");
      }
    })();
  }, []);

  // Delete the player's row on unmount
  useEffect(() => {
    if (!playerId) return;
    const handleUnload = () => {
      removePlayerFromRows(playerId);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, [playerId]);

  // Automatically join a new race as soon as playerId generated or when the roundCount goes up when the player wants to play another race
  useEffect(() => {
    if (!playerId) return;
    (async () => {
      joinRace();
    })();
  }, [roundCount, playerId, joinRace]);

  if (pageState == "loading" || pageState == "failed") {
    return (
      <LoadingScreen
        state={pageState}
        loadMessage="Looking for a race just for you."
        navigate={navigate}
      />
    );
  }

  return (
    <div id="practiceContainer" className="componentContainer">
      <div id="raceContainer" className="card flexColumnGap">
        <p id="raceOn">The race is on! Type the text below:</p>
        <Racetrack wpm={liveValues.wpm} progress={liveValues.progress} />
        <Typer
          key={roundCount}
          handlePulse={handlePulse}
          text={gameText.content}
        />
        <div id="raceButtonsContainer">
          <button className="mediumButton" onClick={() => navigate("menu")}>
            Main menu
          </button>
          <button
            id="raceAgainButton"
            className="mediumButton"
            style={{ display: !gameActive ? "block" : "none" }}
            onClick={joinRace}
          >
            New race
          </button>
        </div>
        {!gameActive && (
          <div id="infoCard" className="card">
            <p>You just typed a quote from:</p>
            <div id="infoContent">
              <div>
                <p>
                  <span id="origin">{gameText.origin}</span>
                  <br />
                  <span id="author">
                    {gameText.type} by: {gameText.author}
                  </span>
                  <br />
                  <span id="uploader">Uploaded by: {gameText.uploader}</span>
                </p>
                <button
                  id="againButton"
                  className="mediumButton"
                  onClick={resetGame}
                >
                  Try again?
                </button>
              </div>
            </div>
            <div id="statCard">
              <span>
                <IoIosSpeedometer /> Speed:
              </span>
              <p>{finalValues?.wpm} WPM</p>
              <span>
                <MdTimer /> Time:
              </span>
              <p>{finalValues?.time}</p>
              <span>
                <AiOutlineAim /> Accuracy
              </span>
              <p>{finalValues?.accuracy}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicRace;
