import Practice from "./components/Practice";
import Menu from "./components/Menu";
import { Activity, useState } from "react";

function App() {
  const [activeComponent, setActiveComponent] = useState("practice");

  return (
    <>
      <div id="backgroundContainer" />
      <div id="mainContainer">
        <Activity mode={activeComponent == "menu" ? "visible" : "hidden"}>
          <Menu navigate={setActiveComponent} />
        </Activity>
        {activeComponent == "practice" && (
          <Practice navigate={setActiveComponent} />
        )}
      </div>
    </>
  );
}

export default App;
