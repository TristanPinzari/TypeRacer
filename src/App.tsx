import { useState, useCallback } from "react";
import Racetrack from "./components/Racetrack";
import Typer from "./components/Typer";

import { IoIosSpeedometer } from "react-icons/io";
import { MdTimer } from "react-icons/md";
import { AiOutlineAim } from "react-icons/ai";

export interface Writing {
  text: string;
  origin: string;
  author: string;
  uploader: string;
}

function App() {
  const [liveValues, setLiveValues] = useState({ wpm: 0, progress: 0 });
  const [finalValues, setFinalValues] = useState({
    wpm: 0,
    time: "",
    accuracy: 0,
  });
  const [roundCount, setRoundCount] = useState(0);
  const [gameActive, setGameActive] = useState(true);
  const [writing, setWriting] = useState<Writing>({
    text: "Betty decided to write a short story.",
    origin: "Random text generator",
    author: "i don't know",
    uploader: "Me (Tristan)",
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

  return (
    <>
      <div id="backgroundContainer" />
      <div id="mainContainer" className="card">
        <Racetrack wpm={liveValues.wpm} progress={liveValues.progress} />
        <Typer
          key={roundCount}
          handlePulse={handlePulse}
          handleFinish={handleFinish}
          text={writing.text}
        />
        <div id="raceButtonsContainer">
          <button className="mediumButton" onClick={reset}>
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
                  <span id="origin">{writing.origin}</span>
                  <br />
                  <span id="author">Written by: {writing.author}</span>
                  <br />
                  <span id="uploader">Uploaded by: {writing.uploader}</span>
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
              <p className="bold">{finalValues.wpm} WPM</p>
              <span>
                <MdTimer /> Time:
              </span>
              <p className="bold">{finalValues.time}</p>
              <span>
                <AiOutlineAim /> Accuracy
              </span>
              <p className="bold">{finalValues.accuracy}%</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
