import Racetrack from "./Racetrack";
import { useState, useCallback, useEffect, useRef } from "react";
import { IoIosSpeedometer } from "react-icons/io";
import { MdTimer } from "react-icons/md";
import { AiOutlineAim } from "react-icons/ai";
import LoadingScreen from "./LoadingScreen";
import type { GameText, Pulse, Race } from "../assets/interfaces";
import { functions, realtime, tablesDB } from "../lib/appwrite";
import PublicTyper from "./PublicTyper";
import PublicRacetrack from "./PublicRacetrack";

export interface TyperMethods {
  startTimer: () => void;
  End: () => void;
}

type GameStatus = "waiting" | "active" | "finished";

const statuses: Record<GameStatus, string> = {
  waiting: "Waiting for players...",
  active: "Race in progress!",
  finished: "Race complete!",
};

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
  const [gameStatus, setGameStatus] = useState<GameStatus>("waiting");
  const [gameText, setGameText] = useState<GameText>({
    content: "ye.",
    origin: "",
    author: "",
    uploader: "",
    type: "",
  });

  const TyperRef = useRef<TyperMethods>(null);
  const statusRef = useRef("waiting");

  const handlePulse = useCallback(
    (stats: Pulse) => {
      setRaceValues(stats);
      if (stats.progress == 1) {
        setGameStatus("finished");
      }
      (async () => {
        try {
          const result = await functions.createExecution({
            functionId: import.meta.env.VITE_APPWRITE_FUNC_PLAYER_MANAGER,
            body: JSON.stringify({
              action: "updateStats",
              data: {
                playerId: playerId,
                wpm: stats.wpm,
                progress: stats.progress,
              },
            }),
          });
          if (result.status === "completed") {
            const responseBody = JSON.parse(result.responseBody);
            if (responseBody.error) {
              console.error("Pulse error:", responseBody.error);
            }
          }
        } catch (error) {
          console.error("Pulse failed:", error);
        }
      })();
    },
    [playerId]
  );

  const queueForRace = useCallback(async () => {
    if (playerId) {
      setGameStatus("waiting");
      setPageState("loading");
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
      setPageState("loading");
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

  console.log("rerender");

  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            setTimeout(() => {
              setPageState("ready");
            }, 0);
          }
        }
      } catch (error) {
        console.error("Execution failed:", error);
        setPageState("failed");
      }
      if (raceData.startTime && statusRef.current == "waiting") {
        statusRef.current = "active";
        setTimeout(() => {
          TyperRef.current?.startTimer();
          setGameStatus("active");
          finishTimeoutRef.current = setTimeout(() => {
            TyperRef.current?.End();
            setGameStatus("finished");
          }, 30000);
        }, Math.max(raceData.startTime - Date.now(), 0));
      }
    })();
    const currentRound = roundCount;
    return () => {
      if (currentRound != roundCount && finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
    };
  }, [raceData, roundCount]);

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
        <p id="raceOn">{statuses[gameStatus]}</p>
        <div className="RacetrackContainer">
          <Racetrack wpm={raceValues.wpm} progress={raceValues.progress} />
          {raceData?.players.map((id) => {
            if (id != playerId) {
              return <PublicRacetrack key={id} playerId={id} />;
            }
          })}
        </div>
        <PublicTyper
          ref={TyperRef}
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
            style={{ display: gameStatus == "finished" ? "block" : "none" }}
            onClick={() => {
              setRoundCount(roundCount + 1);
            }}
          >
            New race
          </button>
        </div>
        {gameStatus == "finished" && (
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
                  onClick={() => {
                    setRoundCount(roundCount + 1);
                  }}
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
