import { useEffect, useState } from "react";
import { realtime } from "../lib/appwrite";
import Racetrack from "./Racetrack";

function PublicRacetrack({ playerId }: { playerId: string }) {
  const [stats, setStats] = useState({ wpm: 0, progress: 0 });

  useEffect(() => {
    const unsubscribe = realtime.subscribe(
      `databases.${
        import.meta.env.VITE_APPWRITE_DATABASE_ID
      }.tables.players.rows.${playerId}`,
      (response) => {
        console.log(response);
        setStats({
          wpm: response.payload.wpm,
          progress: response.payload.progress,
        });
      }
    ) as unknown as () => void;
    console.log("subscribed to ", playerId);

    return () => {
      if (typeof unsubscribe === "function") {
        console.log("uunsubscirbed");
        unsubscribe();
      }
    };
  }, [playerId]);

  return <Racetrack wpm={stats.wpm} progress={stats.progress} />;
}

export default PublicRacetrack;
