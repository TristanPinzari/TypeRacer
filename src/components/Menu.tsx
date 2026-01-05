import { useState, useEffect } from "react";

function Menu({ navigate }: { navigate: (location: string) => void }) {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const handleThemeToggle = () => setDarkMode((prev) => !prev);

  return (
    <div id="menuContainer" className="componentContainer">
      <div id="enterRaceContainer" className="card flexColumnGap">
        <p className="header">TypeRacer - The Global Typing Competition</p>
        <p>Increase your typing speed while racing against others!</p>
        <button className="bigButton" onClick={() => navigate("practice")}>
          Enter a Typing Race
        </button>
        <button id="themeToggle" onClick={handleThemeToggle}>
          Dark mode: {darkMode ? "ON" : "OFF"}
        </button>
      </div>
      <div id="menuOtherCards">
        <div className="card flexColumnGap">
          <p className="header">Typing Test</p>
          <p>Improve your typing skills on your own</p>
          <button className="bigButton" onClick={() => navigate("practice")}>
            Practice yourself
          </button>
        </div>
        <div className="card flexColumnGap">
          <p className="header">Race your friends</p>
          <p>Create your own racetrack and play with friends</p>
          <button className="bigButton">Create racetrack</button>
        </div>
      </div>
    </div>
  );
}

export default Menu;
