import { useState, useMemo, useRef, useEffect, useCallback } from "react";

interface FinalStats {
  wpm: number;
  time: string;
  accuracy: number;
}

interface TyperProps {
  handleFinish: (stats: FinalStats) => void;
  handlePulse: (stats: { wpm: number; progress: number }) => void;
  text: string;
}

function getDisplayData(
  input: string,
  index: number,
  text: string,
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
  const correctWords = text.slice(0, wordStartIndex);
  const currentUntypedLetter =
    input.length >= currentWord.length
      ? text[wordStartIndex + input.length] || ""
      : "";

  if (incorrectStartIndex == null) {
    correctUnderline = text.slice(
      wordStartIndex,
      wordStartIndex + input.length
    );
    incorrectUnderline = "";
    currentUntypedUnderline =
      wordStartIndex + input.length > wordEndIndex - 1
        ? ""
        : text[wordStartIndex + input.length];
    untypedUnderline = text.slice(
      wordStartIndex + input.length + 1,
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
    currentUntypedUnderline =
      wordStartIndex + input.length > wordEndIndex - 1
        ? ""
        : text[wordStartIndex + input.length];
    untypedUnderline = text.slice(
      wordStartIndex +
        Math.min(currentWord.length, input.length) +
        (currentUntypedUnderline.length > 0 ? 1 : 0),
      wordEndIndex
    );
    incorrectWords =
      input.length > currentWord.length
        ? text.slice(wordEndIndex, wordStartIndex + input.length)
        : "";
    untypedWords = text.slice(
      wordStartIndex +
        Math.max(currentWord.length, input.length) +
        (currentUntypedLetter.length > 0 ? 1 : 0)
    );
  }

  const progress =
    (correctWords.length + correctUnderline.length) / text.length;

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

function Typer({ handleFinish, handlePulse, text }: TyperProps) {
  const [textBoxInput, setTextBoxInput] = useState("");
  const [wordIndex, setWordIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeRef = useRef(0);
  const startTimeRef = useRef(0);
  const totalCorrectCharsRef = useRef(0);
  const progressRef = useRef(0);
  const keyStrokesRef = useRef(0);

  const textSplitted = useMemo(() => {
    return text.split(" ");
  }, [text]);

  const displayData = useMemo(() => {
    return getDisplayData(textBoxInput, wordIndex, text, textSplitted);
  }, [textBoxInput, wordIndex, text, textSplitted]);

  function startTimer() {
    if (timerRef.current) return;
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      timeRef.current += 1;
      handlePulse({
        wpm: Math.round(
          totalCorrectCharsRef.current / 5 / (timeRef.current / 60)
        ),
        progress: progressRef.current,
      });
    }, 1000);
  }

  const End = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const seconds = (Date.now() - startTimeRef.current) / 1000;
    const minutes = seconds / 60;
    const newWPM = Math.round(totalCorrectCharsRef.current / 5 / minutes);

    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    const formattedTime = `${mins}:${secs.toString().padStart(2, "0")}`;
    handleFinish({
      wpm: newWPM,
      time: formattedTime,
      accuracy: Math.round((text.length / keyStrokesRef.current) * 100),
    });

    handlePulse({
      wpm: newWPM,
      progress: progressRef.current,
    });
  }, [handleFinish, handlePulse, text]);

  useEffect(() => {
    totalCorrectCharsRef.current =
      displayData.correctWords.length + displayData.correctUnderline.length;
    progressRef.current = displayData.progress;
    if (displayData.progress == 1) {
      End();
    }
  }, [displayData, End]);

  useEffect(() => {
    inputRef.current?.focus();
    handlePulse({
      wpm: 0,
      progress: progressRef.current,
    });
  }, [handlePulse]);

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
      keyStrokesRef.current += 1;
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
      keyStrokesRef.current += 1;
      setTextBoxInput(value);
    }
  }

  return (
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
          } ${displayData.currentUntypedUnderline.length > 0 ? "blinker" : ""}`}
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
        ref={inputRef}
        value={displayData.progress === 1 ? "" : textBoxInput}
        onChange={HandleChange}
        onCopy={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        disabled={displayData.progress == 1}
      />
    </div>
  );
}

export default Typer;
