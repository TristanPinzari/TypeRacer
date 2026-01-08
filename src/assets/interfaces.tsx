export interface GameText {
  content: string;
  origin: string;
  author: string;
  uploader: string;
  type: string;
}

export interface Pulse {
  wpm: number;
  progress: number;
  accuracy: number;
  time: string;
}

export interface Race {
  $id: string;
  status: string;
  textId: string;
  players: string[];
  startTime?: number;
}
