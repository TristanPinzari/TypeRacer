import { LuLoader } from "react-icons/lu";
import { BiSolidErrorAlt } from "react-icons/bi";

function LoadingScreen({
  state,
  loadMessage = "Loading this page just for you.",
  faileMessage = "Something went wrong.",
  navigate,
}: {
  state: string;
  loadMessage?: string;
  faileMessage?: string;
  navigate?: (location: string) => void;
}) {
  return (
    <div className={`LoadingScreen ${state}`}>
      {state == "loading" ? <LuLoader /> : <BiSolidErrorAlt />}
      <p>{state == "loading" ? loadMessage : faileMessage}</p>
      {state == "failed" && navigate && (
        <button onClick={() => navigate("menu")} className="mediumButton">
          Main menu
        </button>
      )}
    </div>
  );
}

export default LoadingScreen;
