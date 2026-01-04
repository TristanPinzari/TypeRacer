import { useState, useRef, useEffect, useMemo } from "react";
import Racetrack from "./components/Racetrack";

interface Writing {
  text: string;
  origin: string;
  author: string;
  uploader: string;
}

function getDisplayData(
  input: string,
  index: number,
  writing: Writing,
  textSplitted: string[]
) {
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
    currentUntypedUnderline,
    untypedUnderline,
    incorrectWords,
    untypedWords;
  const correctWords = writing.text.slice(0, wordStartIndex);
  const currentUntypedLetter =
    input.length >= currentWord.length
      ? writing.text[wordStartIndex + input.length] || ""
      : "";

  if (incorrectStartIndex == null) {
    correctUnderline = writing.text.slice(
      wordStartIndex,
      wordStartIndex + input.length
    );
    incorrectUnderline = "";
    currentUntypedUnderline =
      wordStartIndex + input.length > wordEndIndex - 1
        ? ""
        : writing.text[wordStartIndex + input.length];
    untypedUnderline = writing.text.slice(
      wordStartIndex + input.length + 1,
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
    currentUntypedUnderline =
      wordStartIndex + input.length > wordEndIndex - 1
        ? ""
        : writing.text[wordStartIndex + input.length];
    untypedUnderline = writing.text.slice(
      wordStartIndex +
        Math.min(currentWord.length, input.length) +
        (currentUntypedUnderline.length > 0 ? 1 : 0),
      wordEndIndex
    );
    incorrectWords =
      input.length > currentWord.length
        ? writing.text.slice(wordEndIndex, wordStartIndex + input.length)
        : "";
    untypedWords = writing.text.slice(
      wordStartIndex +
        Math.max(currentWord.length, input.length) +
        (currentUntypedLetter.length > 0 ? 1 : 0)
    );
  }

  const progress =
    (correctWords.length + correctUnderline.length) / writing.text.length;

  return {
    correctWords,
    correctUnderline,
    incorrectUnderline,
    currentUntypedUnderline,
    untypedUnderline,
    incorrectWords,
    currentUntypedLetter,
    untypedWords,
    progress,
  };
}

function App() {
  const [textBoxInput, setTextBoxInput] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [wpm, setWPM] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeRef = useRef(0);
  const startTimeRef = useRef(0);
  const totalCorrectCharsRef = useRef(0);

  const [writing, setWriting] = useState<Writing>({
    text: "BettyBettyBetty decided to write a short story.",
    origin: "Random text generator",
    author: "i don't know",
    uploader: "Me (Tristan)",
  });

  const textSplitted = useMemo(() => {
    return writing.text.split(" ");
  }, [writing.text]);

  const displayData = useMemo(() => {
    return getDisplayData(textBoxInput, wordIndex, writing, textSplitted);
  }, [textBoxInput, wordIndex, writing, textSplitted]);

  function startTimer() {
    if (timerRef.current) return;
    startTimeRef.current = Date.now();
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
    const minutes = (Date.now() - startTimeRef.current) / 60000;
    const newWPM = totalCorrectCharsRef.current / 5 / minutes;
    setWPM(Math.round(newWPM));
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
      let correctLetters = 0;
      const currentWord = textSplitted[wordIndex];
      for (let i = 0; i < value.length; i++) {
        if (value[i] != currentWord[i]) {
          correctLetters = i + 1;
          break;
        }
        correctLetters += 1;
      }
      if (
        value.length - correctLetters > 10 &&
        value.length > textBoxInput.length
      ) {
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
            <span
              className={`${
                displayData.currentUntypedUnderline != " " ? "underline" : ""
              } ${
                displayData.currentUntypedUnderline.length > 0 ? "blinker" : ""
              }`}
            >
              {displayData.currentUntypedUnderline}
            </span>
            <span className="underline">{displayData.untypedUnderline}</span>
            <span className="incorrect">{displayData.incorrectWords}</span>
            <span
              className={
                displayData.currentUntypedLetter.length > 0 ? "blinker" : ""
              }
            >
              {displayData.currentUntypedLetter}
            </span>
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
