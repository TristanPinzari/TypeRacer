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

type GameStatus = "waiting" | "starting" | "active" | "finished";

const statuses: Record<GameStatus, string> = {
  waiting: "Waiting for more players...",
  starting: "Starting in ",
  active: "The race is on!",
  finished: "Race over!",
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
  const [countDown, setCountDown] = useState<number | null>(null);

  const TyperRef = useRef<TyperMethods>(null);
  const lastStatusRef = useRef("waiting");
  const gameStatusToActiveTimeoutRef =
    useRef<ReturnType<typeof setTimeout>>(null);
  const countDownIntervalRef = useRef<ReturnType<typeof setInterval>>(null);

  function startCountDownFrom(seconds: number) {
    seconds = Math.round(seconds);
    setCountDown(seconds);
    countDownIntervalRef.current = setInterval(() => {
      setCountDown((s) => (s == null ? null : s > 0 ? s - 1 : 0));
    }, 1000);
  }

  const handlePulse = useCallback(
    (stats: Pulse) => {
      setRaceValues(stats);
      if (stats.progress == 1) {
        setGameStatus("finished");
      }
      (async () => {
        try {
          const response = await functions.createExecution({
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
          if (response.status === "completed") {
            if (response.responseStatusCode != 200) {
              const responseBody = JSON.parse(response.responseBody);
              console.error(responseBody.error);
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
          const responseBody = JSON.parse(response.responseBody);
          if (response.responseStatusCode == 200) {
            setPlayerId(responseBody.playerId);
          } else {
            console.error("Failed adding player to rows:", responseBody.error);
            setPageState("failed");
          }
        } else {
          console.error("Failed adding player to rows, response incomplete.");
          setPageState("failed");
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
        lastStatusRef.current = newRaceData.status;
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
            setTimeout(() => {
              setPageState("ready");
            }, 0);
          }
        }
      } catch (error) {
        console.error("Execution failed:", error);
        setPageState("failed");
      }
      // Status switched to starting
      if (raceData.status == "waiting" && lastStatusRef.current == "starting") {
        lastStatusRef.current = "starting";
        setGameStatus("starting");
      }
      // Status switched to active
      if (raceData.status == "starting" && lastStatusRef.current == "active") {
        lastStatusRef.current = "active";
        setGameStatus("starting");
        gameStatusToActiveTimeoutRef.current = setTimeout(() => {
          TyperRef.current?.startTimer();
          setGameStatus("active");
        }, 5000);
        startCountDownFrom(5000);
      }
    })();
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
    <div className="componentContainer">
      <div className="TrafficLight card">
        <div
          className={countDown == null || countDown > 2 ? "active" : ""}
        ></div>
        <div
          className={
            countDown && countDown <= 2 && countDown > 0 ? "active" : ""
          }
        ></div>
        <div className={countDown == 0 ? "active" : ""}></div>
      </div>
      <div id="raceContainer" className="card flexColumnGap">
        <p className="raceOn">
          {statuses[gameStatus]} {gameStatus == "starting" ? countDown : ""}
        </p>
        <div className="RacetrackContainer">
          <Racetrack
            you={true}
            wpm={raceValues.wpm}
            progress={raceValues.progress}
          />
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
