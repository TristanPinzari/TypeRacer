import Racetrack from "./Racetrack";
import Typer from "./Typer";

import { functions } from "../lib/appwrite";

import { useState, useCallback, useEffect } from "react";

import { IoIosSpeedometer } from "react-icons/io";
import { MdTimer } from "react-icons/md";
import { AiOutlineAim } from "react-icons/ai";
import LoadingScreen from "./LoadingScreen";
import type { GameText, Pulse } from "../assets/interfaces";

function Practice({ navigate }: { navigate: (location: string) => void }) {
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
    content: "",
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

  const fetchData = async () => {
    try {
      const result = await functions.createExecution({
        functionId: import.meta.env.VITE_APPWRITE_FUNC_PLAYER_MANAGER,
        body: JSON.stringify({
          action: "getRandomText",
        }),
      });
      if (result.status === "completed") {
        const data = JSON.parse(result.responseBody);
        setGameText(data);
        setPageState("ready");
      }
    } catch (error) {
      console.error("Execution failed:", error);
      setPageState("failed");
    }
  };

  function createNewRace() {
    fetchData().then(() => {
      resetGame();
    });
  }

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, []);

  if (pageState == "loading" || pageState == "failed") {
    return (
      <LoadingScreen
        state={pageState}
        loadMessage="Retrieving a random text just for you."
        navigate={navigate}
      />
    );
  }

  return (
    <div className="componentContainer">
      <div id="raceContainer" className="card flexColumnGap">
        <p className="raceOn">The race is on! Type the text below:</p>
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
            onClick={createNewRace}
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

export default Practice;
