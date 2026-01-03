import { useState, useRef, useEffect } from "react";
import Racetrack from "./components/Racetrack";

function App() {
  const [textBoxInput, setTextBoxInput] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [wpm, setWPM] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeRef = useRef(0);
  const totalCorrectCharsRef = useRef(0);

  const text =
    "Betty decided to write a short story and she was sure it was going to be amazing.";
  const textSplitted = text.split(" ");

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

    let correctUnderline,
      incorrectUnderline,
      untypedUnderline,
      incorrectWords,
      untypedWords;
    const correctWords = text.slice(0, wordStartIndex);

    if (incorrectStartIndex == null) {
      correctUnderline = text.slice(
        wordStartIndex,
        wordStartIndex + input.length
      );
      incorrectUnderline = "";
      untypedUnderline = text.slice(
        wordStartIndex + input.length,
        wordEndIndex
      );
      incorrectWords = "";
      untypedWords = text.slice(wordEndIndex);
    } else {
      correctUnderline = text.slice(
        wordStartIndex,
        wordStartIndex + incorrectStartIndex
      );
      incorrectUnderline = text.slice(
        wordStartIndex + incorrectStartIndex,
        wordStartIndex + Math.min(currentWord.length, input.length)
      );
      untypedUnderline = text.slice(
        wordStartIndex + Math.min(currentWord.length, input.length),
        wordEndIndex
      );
      incorrectWords =
        input.length > currentWord.length
          ? text.slice(wordEndIndex, wordStartIndex + input.length)
          : "";
      untypedWords = text.slice(
        wordStartIndex + Math.max(currentWord.length, input.length)
      );
    }

    const progress =
      (correctWords.length + correctUnderline.length) / text.length;

    if (progress === 1) {
      return {
        correctWords: text,
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
    <div id="mainContainer">
      <Racetrack wpm={wpm} progress={displayData.progress} />
      <div id="secondaryContainer">
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
        <button id="againButton" onClick={reset}>
          Play again
        </button>
      </div>
    </div>
  );
}

export default App;
