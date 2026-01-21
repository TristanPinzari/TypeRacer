import { useEffect, useState } from "react";
import { realtime } from "../lib/appwrite";
import Racetrack from "./Racetrack";

function PublicRacetrack({ playerId }: { playerId: string }) {
  const [stats, setStats] = useState({ wpm: 0, progress: 0, place: null });

  useEffect(() => {
    let subscription: { close: () => void };
    (async () => {
      subscription = await realtime.subscribe(
        `databases.${
          import.meta.env.VITE_APPWRITE_DATABASE_ID
        }.tables.players.rows.${playerId}`,
        (response) => {
          setStats({
            wpm: response.payload.wpm,
            progress: response.payload.progress,
            place: response.payload.place,
          });
          if (response.payload.progress >= 1) {
            subscription.close();
          }
        },
      );
    })();
    return () => {
      if (subscription && typeof subscription.close === "function") {
        subscription.close();
      }
    };
  }, [playerId]);

  return (
    <Racetrack wpm={stats.wpm} progress={stats.progress} place={stats.place} />
  );
}

export default PublicRacetrack;
