import SettingsCard from "./components/SettingsCard/SettingsCard.js";
import PacketVisualization from "./components/PacketVisualization/PacketVisualization.js";
import PacketTrack from "./components/PacketTrack/PacketTrack.js";
import StatisticsCard from "./components/StatisticsCard/StatisticsCard.js";
import {SWReceiver, SWSender} from "./lib/src/stopAndWait.js";
import {GBNReceiver, GBNSender} from "./lib/src/goBackN.js";
import {SRReceiver, SRSender} from "./lib/src/selectiveRepeat.js";
import Channel from "./lib/src/Channel.js";
import {Timeout, StatsComputer} from "./lib/src/utils.js";

customElements.define("settings-card", SettingsCard);
customElements.define("packet-visualization", PacketVisualization);
customElements.define("packet-track", PacketTrack);
customElements.define("statistics-card", StatisticsCard);

const settingsCard = document.querySelector("settings-card");
const visualization = document.querySelector("packet-visualization");
const statsCard = document.querySelector("statistics-card");

let sender = null;
let receiver = null;
let channel = null;
let interval = null;
let stats = null;

settingsCard.onStart = (settings) => {
    console.log("started!");
    console.log(settings);

    // Each window base sequence
    let senderBase = null;
    let receiverBase = null;

    let useCAck = false;
    let SenderClass = null;
    let ReceiverClass = null;
    switch (settings.protocol) {
        case 1:
            SenderClass = SWSender;
            ReceiverClass = SWReceiver;
            break;
        case 2:
            SenderClass = GBNSender;
            ReceiverClass = GBNReceiver;
            senderBase = 0;
            break;
        case 4:
            useCAck = true; // SRReceiver with cumulative Acks
        case 3:
            SenderClass = SRSender;
            ReceiverClass = SRReceiver;
            senderBase = 0;
            receiverBase = 0;
    }

    // Initialize stats generation
    statsCard.reset();
    stats = new StatsComputer(2000);
    stats.pause(); // Resume it when actually starting
    stats.onUpdate = () => statsCard.update(stats);

    // Prepare channel
    channel = new Channel({
        delay: settings.delay,
        lossProb: settings.lossProb,
        damageProb: settings.damageProb
    });
    channel.onPacketLost = packet => visualization.removePacket(packet);
    channel.onPacketDamaged = packet => visualization.damagePacket(packet);

    // Prepare receiver
    receiver = new ReceiverClass({
        windowSize: settings.windowSize,
        useCAck
    });
    receiver.onSend = packet => {
        stats.packetSent(packet);
        visualization.sendPacket(packet);
    };
    receiver.onReceive = (packet, channel, isOk) => {
        stats.packetReceived(packet, isOk);
        if(isOk)
            visualization.packetReceived(packet);
    };
    if(receiverBase !== null){
        receiver.onStateChange = () => {
            const spacesToMove = receiver.base - receiverBase;
            receiverBase = receiver.base;
            visualization.moveWindow(spacesToMove, true);
        };
    }

    // Prepare sender
    sender = new SenderClass({
        receiver,
        channel,
        timeout: settings.timeout,
        windowSize: settings.windowSize
    });
    sender.onSend = packet => {
        stats.packetSent(packet);
        visualization.sendPacket(packet);
    };
    sender.onReceive = (packet, channel, isOk) => {
        stats.packetReceived(packet, isOk);
        if(isOk)
            visualization.packetConfirmed(packet);
    };
    if(senderBase !== null){
        sender.onStateChange = () => {
            const spacesToMove = sender.base - senderBase;
            senderBase = sender.base;
            visualization.moveWindow(spacesToMove);
        };
    }
    sender.onTimeoutSet = seqNum => visualization.startTimeout(seqNum);
    sender.onTimeoutUnset = seqNum => visualization.stopTimeout(seqNum);

    // Prepare visualization component    
    visualization.setParams({
        protocol: settings.protocol,
        delay: settings.delay,
        timeout: settings.timeout,
        windowSize: settings.windowSize,
    });
    visualization.onPacketClicked = (packet, ctrlKey) => {
        ctrlKey? channel.damagePacket(packet) : channel.losePacket(packet);
    };
    
    // Start the simulation
    const timeToNextPacket = 60 * 1000 / settings.packetRate;
    sender.send();
    visualization.startNextPacketTimer(timeToNextPacket);
    interval = new Timeout(timeToNextPacket, () => {
        sender.send();
        visualization.startNextPacketTimer(timeToNextPacket);
    }, true);
    stats.resume();
};


settingsCard.onStop = () => {
    // Reset the visualization
    console.log("stopped!");
    interval.stop();
    interval = null;
    sender.stop();
    sender = null;
    channel.stop();
    channel = null;
    receiver = null;
    stats.stop();
    stats = null;
    visualization.reset();
};

settingsCard.onResume = () => {
    // Resum simulation
    stats.resume();
    sender.resume();
    channel.resume();
    interval.resume();
    visualization.resume();
    console.log("resumed!");
};

settingsCard.onPause = () => {
    // Pause simulation
    stats.pause();
    sender.pause();
    channel.pause();
    interval.pause();
    visualization.pause();
    console.log("paused!");
};

document.onvisibilitychange = () => {
    // Pause simulation if the user leaves the tab
    if(document.visibilityState == "hidden")
        settingsCard.pause();
};
