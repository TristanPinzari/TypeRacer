import Practice from "./components/Practice";
import Menu from "./components/Menu";
import { Activity, useState } from "react";
import PublicRace from "./components/PublicRace";
import PrivateRace from "./components/PrivateRace";

function App() {
  const [activeComponent, setActiveComponent] = useState("menu");

  const queryParams = new URLSearchParams(window.location.search);
  const privateRaceId = queryParams.get("id");

  if (privateRaceId) {
    setActiveComponent("privateRace");
  }

  return (
    <>
      <div id="backgroundContainer" />
      <div id="mainContainer" className="flexColumnGap">
        <Activity mode={activeComponent == "menu" ? "visible" : "hidden"}>
          <Menu navigate={setActiveComponent} />
        </Activity>
        {activeComponent == "practice" && (
          <Practice navigate={setActiveComponent} />
        )}
        {activeComponent == "publicRace" && (
          <PublicRace navigate={setActiveComponent} />
        )}
        {activeComponent == "privateRace" && (
          <PrivateRace
            privateRaceId={privateRaceId}
            navigate={setActiveComponent}
          />
        )}
      </div>
    </>
  );
}

export default App;
