import type { GameText } from "./interfaces";

export const offlineTexts: GameText[] = [
  {
    content:
      "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness.",
    origin: "A Tale of Two Cities",
    author: "Charles Dickens",
    uploader: "Offline",
    type: "Book",
  },
  {
    content:
      "Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.",
    origin: "Moby-Dick",
    author: "Herman Melville",
    uploader: "Offline",
    type: "Book",
  },
  {
    content:
      "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families.",
    origin: "Pride and Prejudice",
    author: "Jane Austen",
    uploader: "Offline",
    type: "Book",
  },
];

export function getOfflineText(): GameText {
  return offlineTexts[Math.floor(Math.random() * offlineTexts.length)];
}
