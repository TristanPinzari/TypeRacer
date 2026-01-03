interface RacetrackProps {
  progress: number;
  wpm: number;
}

function Racetrack({ progress = 0, wpm = 0 }: RacetrackProps) {
  return (
    <div className="Racetrack">
      <div style={{ "--progress": `${progress}` } as React.CSSProperties}>
        <div className="avatar"></div>
      </div>
      <p>{wpm} WPM</p>
    </div>
  );
}

export default Racetrack;
