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
import { FaCopy } from "react-icons/fa";

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

function joinRaceById(playerId: string, raceId: string) {
  return functions.createExecution({
    functionId: import.meta.env.VITE_APPWRITE_FUNC_PLAYER_MANAGER,
    body: JSON.stringify({
      action: "joinRaceById",
      data: { playerId: playerId, raceId: raceId },
    }),
  });
}

function createPrivateRace(playerId: string) {
  return functions.createExecution({
    functionId: import.meta.env.VITE_APPWRITE_FUNC_PLAYER_MANAGER,
    body: JSON.stringify({
      action: "createPrivateRace",
      data: { playerId: playerId },
    }),
  });
}

function startRace(raceId: string) {
  return functions.createExecution({
    functionId: import.meta.env.VITE_APPWRITE_FUNC_PLAYER_MANAGER,
    body: JSON.stringify({
      action: "startRace",
      data: { raceId: raceId },
    }),
  });
}

function endRace(raceId: string) {
  return functions.createExecution({
    functionId: import.meta.env.VITE_APPWRITE_FUNC_PLAYER_MANAGER,
    body: JSON.stringify({
      action: "endRace",
      data: { raceId: raceId },
    }),
  });
}

function resetRace(raceId: string) {
  return functions.createExecution({
    functionId: import.meta.env.VITE_APPWRITE_FUNC_PLAYER_MANAGER,
    body: JSON.stringify({
      action: "resetRace",
      data: { raceId: raceId },
    }),
  });
}

async function copyToClipboard(copyText: string) {
  try {
    await navigator.clipboard.writeText(copyText);
    alert("Copied to clipboard!");
  } catch (err) {
    console.error("Failed to copy: ", err);
  }
}

function PrivateRace({
  privateRaceId,
  navigate,
}: {
  privateRaceId: string | null;
  navigate: (location: string) => void;
}) {
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
  const [place, setPlace] = useState<null | number>(null);
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

  function clearRefsForNewGame() {
    const refsToClear = [gameStatusToActiveTimeoutRef, countDownIntervalRef];
    for (const ref of refsToClear) {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    }
  }

  function startCountDownFrom(seconds: number) {
    seconds = Math.round(seconds);
    setCountDown(seconds);
    countDownIntervalRef.current = setInterval(() => {
      setCountDown((s) => (s == null ? null : s > 0 ? s - 1 : 0));
    }, 1000);
  }

  const handlePulse = useCallback(
    (stats: Pulse) => {
      if (!playerId || !raceId) {
        console.warn("Pulse skipped: playerId or raceId is missing", {
          playerId,
          raceId,
        });
        return;
      }
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
                raceId: raceId,
                wpm: stats.wpm,
                progress: stats.progress,
              },
            }),
          });
          if (response.status === "completed") {
            const responseBody = JSON.parse(response.responseBody);
            if (response.responseStatusCode == 200) {
              if (responseBody.place) {
                setPlace(responseBody.place);
              }
            } else {
              console.error(responseBody.error);
            }
          }
        } catch (error) {
          console.error("Pulse failed:", error);
        }
      })();
    },
    [playerId, raceId],
  );

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
      try {
        const response = privateRaceId
          ? await joinRaceById(playerId, privateRaceId)
          : await createPrivateRace(playerId);
        if (response.status === "completed") {
          const responseBody = JSON.parse(response.responseBody);
          if (response.responseStatusCode === 200) {
            setRaceId(responseBody.raceId);
          } else {
            console.error("Failed to join/create race:", responseBody.error);
            setPageState("failed");
          }
        } else {
          console.error(response.errors);
          setPageState("failed");
        }
      } catch (error) {
        console.error("Function execution failed:", error);
        setPageState("failed");
      }
    })();
  }, [playerId, privateRaceId]);

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
        setPlace(null);
        setGameStatus(newRaceData.status);
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
      },
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
      // In case the host ends the race before it even starts.
      if (
        raceData.status == "finished" &&
        lastStatusRef.current != "finished"
      ) {
        setCountDown(null);
        clearRefsForNewGame();
      }
      // Status switched to active
      if (raceData.status == "active" && lastStatusRef.current == "waiting") {
        lastStatusRef.current = "active";
        setGameStatus("starting");
        gameStatusToActiveTimeoutRef.current = setTimeout(() => {
          TyperRef.current?.startTimer();
          setGameStatus("active");
        }, 5000);
        startCountDownFrom(5);
      }
      // Status switched to finished
      if (raceData.status == "finished" && lastStatusRef.current == "active") {
        lastStatusRef.current = "finished";
        TyperRef.current?.End();
        setGameStatus("finished");
      }
      // Status switched to waiting
      if (raceData.status == "waiting" && lastStatusRef.current == "finished") {
        setPlace(null);
        setGameStatus("waiting");
        setRoundCount(roundCount + 1);
        lastStatusRef.current = "waiting";
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
            place={place}
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
          {raceData?.host == playerId && raceData?.status == "waiting" && (
            <button
              className="mediumButton secondary"
              onClick={() =>
                raceId
                  ? startRace(raceId)
                  : console.log("You can't start a race if you're not in one.")
              }
            >
              Start race
            </button>
          )}
          {raceData?.host == playerId && raceData?.status == "active" && (
            <button
              className="mediumButton secondary"
              onClick={() =>
                raceId
                  ? endRace(raceId)
                  : console.log("You can't end a race if you're not in one.")
              }
            >
              End race
            </button>
          )}
          {raceData?.host == playerId && raceData?.status == "finished" && (
            <button
              id="raceAgainButton"
              className="mediumButton"
              style={{ display: gameStatus == "finished" ? "block" : "none" }}
              onClick={() => (raceId ? resetRace(raceId) : null)}
            >
              New race
            </button>
          )}
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
      {raceData?.host == playerId && (
        <div
          className="card"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            padding: "1rem",
          }}
        >
          Invite your friends with link:
          <a style={{ textDecoration: "underline" }}>
            {window.location.href + "?id=" + raceId}
          </a>
          <FaCopy
            style={{ cursor: "pointer" }}
            onClick={() =>
              copyToClipboard(window.location.href + "?id=" + raceId)
            }
          />
        </div>
      )}
    </div>
  );
}

export default PrivateRace;
