import SettingsCard from "./components/SettingsCard/component.js";
import PacketVisualization from "./components/PacketVisualization/component.js";
import PacketTrack from "./components/PacketTrack/component.js";
import StatisticsCard from "./components/StatisticsCard/component.js";
import {SWReceiver, SWSender} from "./lib/src/stopAndWait.js";
import {GBNReceiver, GBNSender} from "./lib/src/goBackN.js";
import {SRReceiver, SRSender} from "./lib/src/selectiveRepeat.js";
import Channel from "./lib/src/Channel.js";
import {Timeout, StatsComputer} from "./lib/src/utils.js";
import { AbstractWindowedSender } from "./lib/src/abstractNodes.js";

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
            break;
        case 4:
            useCAck = true; // SRReceiver with cumulative Acks
        case 3:
            SenderClass = SRSender;
            ReceiverClass = SRReceiver;
    }

    // Initialize stats generation
    statsCard.reset();
    stats = new StatsComputer(2000);
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
        useCAck,
        channel
    });
    receiver.onSend = packet => {
        stats.pktSent(packet);
        visualization.sendPacket(packet);
    };
    receiver.onReceive = (packet, isOk) => {
        stats.pktReceived(packet, isOk);
        if(isOk)
            visualization.packetReceived(packet);
    };
    if(receiver instanceof SRReceiver)
        receiver.onWindowMoved = spaces => visualization.moveReceiverWindow(spaces);

    // Prepare sender
    sender = new SenderClass({
        receiver,
        channel,
        timeout: settings.timeout,
        windowSize: settings.windowSize
    });
    sender.onSend = packet => {
        stats.pktSent(packet);
        visualization.sendPacket(packet);
    };
    sender.onReceive = (packet, isOk) => stats.pktReceived(packet, isOk);
    sender.onPktConfirmed = seqNum => {
        visualization.packetConfirmed(seqNum);
        stats.pktConfirmed();
        if(sender instanceof SWSender)
            visualization.moveSenderWindow(1);
    };
    sender.onTimeoutSet = seqNum => visualization.startTimeout(seqNum);
    sender.onTimeoutUnset = seqNum => visualization.stopTimeout(seqNum);
    if(sender instanceof AbstractWindowedSender)
        sender.onWindowMoved = spaces => visualization.moveSenderWindow(spaces)

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
    stats.start();
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
    // Resume the simulation
    stats.resume();
    sender.resume();
    channel.resume();
    interval.resume();
    visualization.resume();
    console.log("resumed!");
};

settingsCard.onPause = () => {
    // Pause the simulation
    stats.pause();
    sender.pause();
    channel.pause();
    interval.pause();
    visualization.pause();
    console.log("paused!");
};

document.onvisibilitychange = () => {
    // Pause the simulation if the user leaves the tab
    if(document.visibilityState == "hidden")
        settingsCard.pause();
};
