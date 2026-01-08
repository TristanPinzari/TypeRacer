export interface gameText {
  content: string;
  origin: string;
  author: string;
  uploader: string;
  type: string;
}

export interface pulse {
  wpm: number;
  progress: number;
  accuracy: number;
  time: string;
}
