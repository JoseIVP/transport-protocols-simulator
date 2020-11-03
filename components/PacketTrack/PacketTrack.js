/**
 * A web component for an svg that represents a packet track
 * between a sender (top) and a receiver (bottom).
 */
export default class PacketTrack extends HTMLElement{

    constructor(){
        super();
        this.attachShadow({mode: "open"});
        const template = document.getElementById("packet-track");
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.svg = this.shadowRoot.querySelector("svg");
        this.timer = this.shadowRoot.querySelector(".timer");
        this.sender = this.shadowRoot.querySelector(".sender");
        this.receiver = this.shadowRoot.querySelector(".receiver");
        this.packets = new Map();
    }

    /**
     * Start the timer animation for the sender.
     * @param {number} duration - The duration of the timer animation.
     */
    startTimer(duration){
        this.timer.style.display = "inline";
        const keyframes = [
            {strokeDashoffset: 0},
            {strokeDashoffset: -157} // timerDiameter * PI = 157
        ];
        const options = {duration};
        const animation = this.timer.animate(keyframes, options);
        animation.onfinish = () => {
            this.timer.style.display = "none";
        };
    }

    /**
     * Starts the animation of sending a packet from one end to the other,
     * depending on the value of isAck. If isAck is true then, a packet
     * is sent from the receiver to the sender, otherwise is the reverse.
     * @param {number} id - The id of the packet (not the sequence number).
     * @param {number} delay - The time that takes the packet to travel from
     * on end to the other.
     * @param {boolean} isAck - Whether to send a packet from the sender or an
     * acknowledgment from the receiver.
     */
    sendPacket(id, delay, isAck=false){
        const packet = document.createElementNS("http://www.w3.org/2000/svg", "use");
        packet.dataset.id = id;
        // TODO: change this to be able to set a handler
        packet.onclick = () => console.log(packet.dataset.id);
        packet.setAttribute("href", "#packet");
        packet.style.fill = isAck? "#9CD8A2" : "#B2D0F9";
        packet.style.stroke = isAck? "#3AB146" : "#65A2F4";
        this.svg.append(packet);
        const keyframes = [
            {transform: `translate(0px, ${isAck? 774 : 26}px)`},
            {transform: `translate(0px,${isAck? 26 : 774}px)`}
        ];
        const options = {duration: delay};
        const animation = packet.animate(keyframes, options);
        animation.onfinish = () => {
            this.svg.removeChild(packet);
            this.packets.delete(packet.dataset.id);
        }
    }

    /**
     * Change receiver end to look like a confirmed packet.
     */
    packetConfirmed(){
        this.sender.classList.replace("pkt-buffered", "pkt-confirmed");
    }

    /**
     * Change the sender end to look like a received packet.
     */
    packetReceived(){
        this.receiver.classList.replace("pkt-not-received", "pkt-received");
    }

    /**
     * Reset the sender and receiver ends to look like buffered and not
     * received packets respectively.
     */
    reset(){
        this.sender.classList.replace("pkt-confirmed", "pkt-buffered");
        this.receiver.classList.replace("pkt-received", "pkt-not-received");
    }
}
