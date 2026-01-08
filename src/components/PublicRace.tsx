import Racetrack from "./Racetrack";
import Typer from "./Typer";

import { useState, useCallback, useEffect } from "react";

import { IoIosSpeedometer } from "react-icons/io";
import { MdTimer } from "react-icons/md";
import { AiOutlineAim } from "react-icons/ai";
import LoadingScreen from "./LoadingScreen";
import type { GameText, Pulse, Race } from "../assets/interfaces";
import { functions, realtime, tablesDB } from "../lib/appwrite";

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

function joinRace(playerId: string) {
  return functions.createExecution({
    functionId: import.meta.env.VITE_APPWRITE_FUNC_PLAYER_MANAGER,
    body: JSON.stringify({
      action: "joinRace",
      data: { playerId: playerId },
    }),
  });
}

function PublicRace({ navigate }: { navigate: (location: string) => void }) {
  const [playerId, setPlayerId] = useState(null);
  const [raceId, setRaceId] = useState(null);
  const [raceData, setRaceData] = useState<Race>();
  const [pageState, setPageState] = useState("loading");
  const [raceValues, setRaceValues] = useState<Pulse>({
    wpm: 0,
    progress: 0,
    accuracy: 0,
    time: "",
  });
  const [roundCount, setRoundCount] = useState(0);
  const [gameActive, setGameActive] = useState(true);
  const [gameText, setGameText] = useState<GameText>({
    content: "ye.",
    origin: "",
    author: "",
    uploader: "",
    type: "",
  });

  const handlePulse = useCallback((stats: Pulse) => {
    setRaceValues(stats);
    if (stats.progress == 1) {
      setGameActive(false);
    }
  }, []);

  function resetGame() {
    setRoundCount((prev) => prev + 1);
    setGameActive(true);
  }

  const queueForRace = useCallback(async () => {
    if (playerId) {
      try {
        const response = await joinRace(playerId);
        if (response.status === "completed") {
          const responseBody = JSON.parse(response.responseBody);
          if (responseBody.error) {
            console.error("Function error:", responseBody.error);
            setPageState("failed");
          } else {
            setRaceId(responseBody.raceId);
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
      queueForRace();
    })();
  }, [roundCount, playerId, queueForRace]);

  // Sets raceData and subscribes to it
  useEffect(() => {
    if (!raceId) return;
    (async () => {
      try {
        const newRaceData = await tablesDB.getRow({
          databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
          tableId: "races",
          rowId: raceId,
        });
        setRaceData(newRaceData as unknown as Race);
      } catch (error) {
        console.error("Error while retrieving race data:", error);
        setPageState("failed");
      }
    })();

    const unsubscribe = realtime.subscribe(
      `databases.${
        import.meta.env.VITE_APPWRITE_DATABASE_ID
      }.tables.races.rows.${raceId}`,
      (response) => {
        setRaceData(response.payload);
      }
    ) as unknown as () => void;

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [raceId]);

  useEffect(() => {
    if (!raceData) return;
    (async () => {
      try {
        const result = await functions.createExecution({
          functionId: import.meta.env.VITE_APPWRITE_FUNC_PLAYER_MANAGER,
          body: JSON.stringify({
            action: "getTextById",
            data: { textId: raceData.textId },
          }),
        });
        if (result.status === "completed") {
          const responseBody = JSON.parse(result.responseBody);
          if (responseBody.error) {
            console.error("Function error:", responseBody.error);
            setPageState("failed");
          } else {
            setGameText(responseBody);
            setPageState("ready");
          }
        }
      } catch (error) {
        console.error("Execution failed:", error);
        setPageState("failed");
      }
    })();
  }, [raceData]);

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
        <Racetrack wpm={raceValues.wpm} progress={raceValues.progress} />
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
            onClick={queueForRace}
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
              <p>{raceValues.wpm} WPM</p>
              <span>
                <MdTimer /> Time:
              </span>
              <p>{raceValues.time}</p>
              <span>
                <AiOutlineAim /> Accuracy
              </span>
              <p>{raceValues.accuracy}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicRace;
