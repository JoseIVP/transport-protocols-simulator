import SettingsCard from "./components/SettingsCard/SettingsCard.js";
import PacketVisualization from "./components/PacketVisualization/PacketVisualization.js";
import PacketTrack from "./components/PacketTrack/PacketTrack.js";

customElements.define("settings-card", SettingsCard);
customElements.define("packet-visualization", PacketVisualization);
customElements.define("packet-track", PacketTrack);

const settingsCard = document.querySelector("settings-card");
const visualization = document.querySelector("packet-visualization");

settingsCard.onStart = (settings) => {
    console.log("start!");
    console.log(settings);
};

settingsCard.onStop = () => {
    console.log("stop!");
};