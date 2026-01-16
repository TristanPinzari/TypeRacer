import * as assets from "../assets";

interface RacetrackProps {
  noText?: boolean;
  name?: string;
  you?: boolean;
  progress: number;
  wpm: number;
  place: number | null;
}

function Racetrack({
  noText = false,
  name = "Guest",
  you = false,
  progress = 0,
  wpm = 0,
  place = null,
}: RacetrackProps) {
  return (
    <div className="Racetrack">
      <div style={{ "--progress": `${progress}` } as React.CSSProperties}>
        <div className="avatar">
          {!noText && (
            <div className="text">
              {name}
              <br />
              {you && <span>(You)</span>}
            </div>
          )}
          <img className="car" src={assets.car_red}></img>
        </div>
      </div>
      <p>{wpm} WPM</p>
      <p>{place}</p>
    </div>
  );
}

export default Racetrack;
