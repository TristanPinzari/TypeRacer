import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { Pulse } from "../assets/interfaces";

export interface TyperMethods {
  startTimer: () => void;
  End: () => void;
}

interface TyperProps {
  handlePulse: (stats: Pulse) => void;
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

const PublicTyper = forwardRef<TyperMethods, TyperProps>(
  ({ handlePulse, text }, ref) => {
    const [textBoxInput, setTextBoxInput] = useState("");
    const [wordIndex, setWordIndex] = useState(0);
    const [raceEnded, setRaceEnded] = useState(false);
    const [raceStarted, setRaceStarted] = useState(false);

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
      setRaceStarted(true);
      timerRef.current = setInterval(() => {
        timeRef.current += 1;
        handlePulse({
          wpm: Math.round(
            totalCorrectCharsRef.current / 5 / (timeRef.current / 60)
          ),
          progress: progressRef.current,
          accuracy: 0,
          time: "",
        });
      }, 1000);
    }

    const End = useCallback(() => {
      if (raceEnded) {
        return;
      }
      setRaceEnded(true);
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

      handlePulse({
        wpm: newWPM,
        progress: progressRef.current,
        time: formattedTime,
        accuracy: Math.round((text.length / keyStrokesRef.current) * 100),
      });
    }, [handlePulse, text, raceEnded]);
    const EndCallback = useRef<() => void>(End);

    useImperativeHandle(ref, () => ({
      startTimer,
      End,
    }));

    useEffect(() => {
      if (raceEnded) return;
      totalCorrectCharsRef.current =
        displayData.correctWords.length + displayData.correctUnderline.length;
      progressRef.current = displayData.progress;
      if (displayData.progress == 1) {
        EndCallback.current();
      }
    }, [displayData, raceEnded]);

    useEffect(() => {
      handlePulse({
        wpm: 0,
        progress: progressRef.current,
        time: "",
        accuracy: 0,
      });
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (raceStarted) {
        inputRef.current?.focus();
      }
    }, [raceStarted]);

    function HandleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const value = e.target.value;
      const isCurrentWordCorrect =
        displayData.incorrectWords.length +
          displayData.incorrectUnderline.length ===
        0;

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
        className="card flexColumnGap"
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
              displayData.currentUntypedUnderline.length > 0
                ? "blinker untyped"
                : "untyped"
            }`}
          >
            {displayData.currentUntypedUnderline}
          </span>
          <span className="underline untyped">
            {displayData.untypedUnderline}
          </span>
          <span className="incorrect">{displayData.incorrectWords}</span>
          <span
            className={
              displayData.currentUntypedLetter.length > 0
                ? "blinker untyped"
                : "untyped"
            }
          >
            {displayData.currentUntypedLetter}
          </span>
          <span className="untyped">{displayData.untypedWords}</span>
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
          autoComplete="off"
          autoFocus
          disabled={!raceStarted}
          style={{
            display: displayData.progress == 1 || raceEnded ? "none" : "block",
          }}
        />
      </div>
    );
  }
);

export default PublicTyper;
