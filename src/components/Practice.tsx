import Racetrack from "./Racetrack";
import Typer from "./Typer";

import { functions } from "../lib/appwrite";

import { useState, useCallback, useEffect } from "react";

import { IoIosSpeedometer } from "react-icons/io";
import { MdTimer } from "react-icons/md";
import { AiOutlineAim } from "react-icons/ai";

export interface gameText {
  content: string;
  origin: string;
  author: string;
  uploader: string;
}

function Practice({ navigate }: { navigate: (location: string) => void }) {
  const [liveValues, setLiveValues] = useState({ wpm: 0, progress: 0 });
  const [finalValues, setFinalValues] = useState({
    wpm: 0,
    time: "",
    accuracy: 0,
  });

  const [roundCount, setRoundCount] = useState(0);
  const [gameActive, setGameActive] = useState(true);
  const [gameText, setGameText] = useState<gameText>({
    content: "",
    origin: "",
    author: "",
    uploader: "",
  });

  const handlePulse = useCallback(
    (stats: { wpm: number; progress: number }) => {
      setLiveValues(stats);
    },
    []
  );

  const handleFinish = useCallback(
    (stats: { wpm: number; time: string; accuracy: number }) => {
      setFinalValues(stats);
      setGameActive(false);
    },
    []
  );

  function reset() {
    setRoundCount((prev) => prev + 1);
    setGameActive(true);
  }

  useEffect(() => {
    (async () => {
      try {
        const result = await functions.createExecution(
          import.meta.env.VITE_APPWRITE_FUNC_GET_RANDOM_TEXT
        );
        if (result.status === "completed") {
          const data = JSON.parse(result.responseBody);
          setGameText(data);
        }
      } catch (error) {
        console.error("Execution failed:", error);
      }
    })();
  }, []);

  return (
    <div id="practiceContainer" className="componentContainer">
      <div id="raceContainer" className="card flexColumnGap">
        <p id="raceOn">The race is on! Type the text below:</p>
        <Racetrack wpm={liveValues.wpm} progress={liveValues.progress} />
        <Typer
          key={roundCount}
          handlePulse={handlePulse}
          handleFinish={handleFinish}
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
          >
            Race again
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
                  <span id="author">Written by: {gameText.author}</span>
                  <br />
                  <span id="uploader">Uploaded by: {gameText.uploader}</span>
                </p>
                <button
                  id="againButton"
                  className="mediumButton"
                  onClick={reset}
                >
                  Try again?
                </button>
              </div>
            </div>
            <div id="statCard">
              <span>
                <IoIosSpeedometer /> Speed:
              </span>
              <p>{finalValues.wpm} WPM</p>
              <span>
                <MdTimer /> Time:
              </span>
              <p>{finalValues.time}</p>
              <span>
                <AiOutlineAim /> Accuracy
              </span>
              <p>{finalValues.accuracy}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Practice;
