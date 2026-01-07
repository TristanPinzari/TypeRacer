import Practice from "./components/Practice";
import Menu from "./components/Menu";
import { Activity, useState } from "react";
import PublicRace from "./components/PublicRace";

function App() {
  const [activeComponent, setActiveComponent] = useState("menu");
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
      </div>
    </>
  );
}

export default App;
