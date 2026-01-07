import { LuLoader } from "react-icons/lu";
import { BiSolidErrorAlt } from "react-icons/bi";

function LoadingScreen({
  state,
  navigate,
}: {
  state: string;
  navigate: (location: string) => void;
}) {
  return (
    <div className={`LoadingScreen ${state}`}>
      {state == "loading" ? <LuLoader /> : <BiSolidErrorAlt />}
      <p>
        {state == "loading"
          ? "Loading this page just for you."
          : "Something went wrong."}
      </p>
      {state == "failed" && (
        <button onClick={() => navigate("menu")} className="mediumButton">
          Main menu
        </button>
      )}
    </div>
  );
}

export default LoadingScreen;
