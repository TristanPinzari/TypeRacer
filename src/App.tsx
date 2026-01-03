import { useState, useRef, useEffect, useMemo } from "react";
import Racetrack from "./components/Racetrack";

function App() {
  const [textBoxInput, setTextBoxInput] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [wpm, setWPM] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeRef = useRef(0);
  const totalCorrectCharsRef = useRef(0);

  const [writing, setWriting] = useState({
    text: "Betty decided to write a short story and she was sure it was going to be amazing.",
    origin: "Random text generator",
    author: "i don't know",
    uploader: "Me (Tristan)",
  });

  const textSplitted = useMemo(() => {
    return writing.text.split(" ");
  }, [writing.text]);

  function getDisplayData(input: string, index: number) {
    const currentWord = textSplitted[index] || "";
    const wordStartIndex =
      index === 0 ? 0 : textSplitted.slice(0, index).join(" ").length + 1;
    const wordEndIndex = wordStartIndex + currentWord.length;

    let incorrectStartIndex = null;
    for (let i = 0; i < Math.min(currentWord.length, input.length); i++) {
      if (currentWord[i] !== input[i]) {
        incorrectStartIndex = i;
        break;
      }
    }
    if (incorrectStartIndex == null && currentWord.length < input.length) {
      incorrectStartIndex = currentWord.length;
    }

    let correctUnderline,
      incorrectUnderline,
      untypedUnderline,
      incorrectWords,
      untypedWords;
    const correctWords = writing.text.slice(0, wordStartIndex);

    if (incorrectStartIndex == null) {
      correctUnderline = writing.text.slice(
        wordStartIndex,
        wordStartIndex + input.length
      );
      incorrectUnderline = "";
      untypedUnderline = writing.text.slice(
        wordStartIndex + input.length,
        wordEndIndex
      );
      incorrectWords = "";
      untypedWords = writing.text.slice(wordEndIndex);
    } else {
      correctUnderline = writing.text.slice(
        wordStartIndex,
        wordStartIndex + incorrectStartIndex
      );
      incorrectUnderline = writing.text.slice(
        wordStartIndex + incorrectStartIndex,
        wordStartIndex + Math.min(currentWord.length, input.length)
      );
      untypedUnderline = writing.text.slice(
        wordStartIndex + Math.min(currentWord.length, input.length),
        wordEndIndex
      );
      incorrectWords =
        input.length > currentWord.length
          ? writing.text.slice(wordEndIndex, wordStartIndex + input.length)
          : "";
      untypedWords = writing.text.slice(
        wordStartIndex + Math.max(currentWord.length, input.length)
      );
    }

    const progress =
      (correctWords.length + correctUnderline.length) / writing.text.length;

    if (progress === 1) {
      return {
        correctWords: writing.text,
        correctUnderline: "",
        incorrectUnderline: "",
        untypedUnderline: "",
        incorrectWords: "",
        untypedWords: "",
        progress: 1,
      };
    }

    return {
      correctWords,
      correctUnderline,
      incorrectUnderline,
      untypedUnderline,
      incorrectWords,
      untypedWords,
      progress,
    };
  }

  const displayData = getDisplayData(textBoxInput, wordIndex);

  function startTimer() {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      timeRef.current += 1;
      const minutes = (timeRef.current || 0) / 60;
      const newWPM = totalCorrectCharsRef.current / 5 / minutes;
      setWPM(Math.round(newWPM));
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function reset() {
    setWordIndex(0);
    setWPM(0);
    setTextBoxInput("");
    stopTimer();
    timeRef.current = 0;
  }

  useEffect(() => {
    totalCorrectCharsRef.current =
      displayData.correctWords.length + displayData.correctUnderline.length;
    if (displayData.progress == 1) {
      stopTimer();
    }
  }, [displayData]);

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  function HandleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    const isCurrentWordCorrect =
      displayData.incorrectWords.length +
        displayData.incorrectUnderline.length ===
      0;

    if (!timerRef.current && value.length === 1 && wordIndex === 0) {
      startTimer();
    }

    if (
      isCurrentWordCorrect &&
      textBoxInput.includes(textSplitted[wordIndex]) &&
      value.endsWith(" ")
    ) {
      setTextBoxInput("");
      setWordIndex(wordIndex + 1);
    } else {
      const totalErrors =
        displayData.incorrectWords.length +
        displayData.incorrectUnderline.length;
      if (totalErrors >= 10 && value.length > textBoxInput.length) {
        return;
      }
      setTextBoxInput(value);
    }
  }

  return (
    <>
      <div id="backgroundContainer" />
      <div id="mainContainer" className="card">
        <Racetrack wpm={wpm} progress={displayData.progress} />
        <div
          id="secondaryContainer"
          style={{ display: displayData.progress == 1 ? "none" : "flex" }}
        >
          <p id="textDisplay">
            <span className="correct">{displayData.correctWords}</span>
            <span className="correct underline">
              {displayData.correctUnderline}
            </span>
            <span className="incorrect underline">
              {displayData.incorrectUnderline}
            </span>
            <span className="underline">{displayData.untypedUnderline}</span>
            <span className="incorrect">{displayData.incorrectWords}</span>
            <span>{displayData.untypedWords}</span>
          </p>
          <input
            id="textBox"
            className={
              displayData.incorrectWords.length +
                displayData.incorrectUnderline.length >
              0
                ? "incorrect"
                : ""
            }
            value={displayData.progress === 1 ? "" : textBoxInput}
            onChange={HandleChange}
            onCopy={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            disabled={displayData.progress === 1}
          />
        </div>
        <div id="raceButtonsContainer">
          <button className="mediumButton" onClick={reset}>
            Main menu
          </button>
          <button
            id="raceAgainButton"
            className="mediumButton"
            style={{ display: displayData.progress == 1 ? "block" : "none" }}
          >
            Race again
          </button>
        </div>
        {displayData.progress == 1 && (
          <div id="infoCard" className="card">
            <p>You just typed a quote from:</p>
            <div id="infoContent">
              <div>
                <p>
                  {writing.origin}
                  <br />
                  {writing.author}
                  <br />
                  {writing.uploader}
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
          </div>
        )}
      </div>
    </>
  );
}

export default App;
