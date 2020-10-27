import SettingsCard from "./components/SettingsCard/SettingsCard.js";

customElements.define("settings-card", SettingsCard);

const settingsCard = document.querySelector("settings-card");

settingsCard.onStart = (settings) => {
    console.log("start!");
    console.log(settings);
};

settingsCard.onStop = () => {
    console.log("stop!");
};