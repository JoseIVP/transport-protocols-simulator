/**
 * A web component for an svg that represents a packet track
 * between a sender (top) and a receiver (bottom).
 */
export default class PacketTrack extends HTMLElement{

    constructor(){
        super();
        this.attachShadow({mode: "open"});
        const template = document.querySelector("#packet-track");
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.svg = this.shadowRoot.querySelector("svg");
        this.timer = this.shadowRoot.querySelector("#timer");
        this.sender = this.shadowRoot.querySelector("#sender");
        this.receiver = this.shadowRoot.querySelector("#receiver");
        // Maps packets to their svg representations
        this.packets = new Map();
        this.timerAnimation = null;
    }

    /**
     * Starts the timer animation in the sender side.
     * @param {number} duration - The duration of the timer.
     * @param {boolean} isNextSequence - true if the animation should be for
     * trying to send the next sequence.
     */
    startTimer(duration, isNextSequence=false){
        if(isNextSequence)
            this.timer.classList.add("next-sequence");
        else
            this.timer.classList.remove("next-sequence"); 
        const keyframes = [
            { visibility: "visible", strokeDashoffset: 0},
            { visibility: "hidden", strokeDashoffset: -157} // timerDiameter * PI = 157
        ];
        const options = {duration};
        this.timerAnimation = this.timer.animate(keyframes, options);
    }

    /**
     * Stops the timer animation.
     */
    stopTimer(){
        this.timerAnimation?.finish();
        this.timerAnimation = null;
    }

    /**
     * Starts the animation of sending a packet from one end to the other.
     * It sends a packet from receiver to sender if it is an acknowledgment
     * and does the opposite if it is a regular packet.
     * @param {Packet} packet - The packet related to the animation.
     * @param {number} delay - The time that takes the packet to travel from
     * one end to the other.
     */
    sendPacket(packet, delay){
        const {isAck} = packet;
        const svgPacket = document.createElementNS("http://www.w3.org/2000/svg", "use");
        svgPacket.onclick = () => this.onPacketClicked(packet);
        svgPacket.setAttribute("href", "#packet-rect");
        svgPacket.classList.add("pkt-traveling");
        svgPacket.classList.add(isAck? "pkt-acknowledgment" : "pkt-buffered");
        this.svg.append(svgPacket);
        const keyframes = [
            { visibility: "visible", transform: `translate(0px, ${isAck? 774 : 26}px)`},
            { visibility: "hidden", transform: `translate(0px,${isAck? 26 : 774}px)`}
        ];
        const options = {duration: delay};
        const animation = svgPacket.animate(keyframes, options);
        this.packets.set(packet, {
            svg: svgPacket,
            animation
        });
        animation.onfinish = () => {
            this.svg.removeChild(svgPacket);
            this.packets.delete(packet);
        }
    }

    /**
     * A callback that is fired when a packet svg is clicked.
     * @param {Packet} packet - The packet related to the svg.
     */
    onPacketClicked(packet){
        return
    }

    /**
     * Changes the receiver end to look like a confirmed packet.
     */
    packetConfirmed(){
        this.sender.classList.replace("pkt-buffered", "pkt-confirmed");
    }

    /**
     * Changes the sender end to look like a received packet.
     */
    packetReceived(){
        this.receiver.classList.replace("pkt-not-received", "pkt-received");
    }

    /**
     * Resets the component.
     */
    reset(){
        this.sender.classList.replace("pkt-confirmed", "pkt-buffered");
        this.receiver.classList.replace("pkt-received", "pkt-not-received");
        this.stopTimer();
        for(const {animation} of this.packets.values())
            animation.finish();
        this.packets = new Map();
    }

    /**
     * Removes a packet after stopping it and showing it as
     * a lost packet for 200 ms.
     * @param {Packet} packet - The packet related to the svg.
     */
    losePacket(packet){
        const packetInfo = this.packets.get(packet);
        if(packetInfo !== undefined){
            packetInfo.animation.pause();
            packetInfo.svg.classList.add("pkt-lost");
            setTimeout(() => {
                packetInfo.animation.finish();
            }, 200);
        }
    }
}
