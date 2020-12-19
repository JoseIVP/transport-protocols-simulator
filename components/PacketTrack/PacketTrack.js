/** A class that pairs SVGs and Animations. */
class SVGAnimationPair{  
    
    /** @member {SVGElement} */
    svg;
    /** @member {Animation} */
    animation;

    /**
     * Creates a new pair.
     * @param {SVGElement} svg
     * @param {Animation} animation 
     */
    constructor(svg, animation){
        this.svg = svg;
        this.animation = animation;
    }
}


/**
 * A web component for an svg that represents a packet track between a sender
 * (top) and a receiver (bottom).
 */
export default class PacketTrack extends HTMLElement{

    /**
     * @member {SVGSVGElement} - The root svg.
     * @private
     */
    _rootSvg;
    /**
     * @member {SVGGElement} - The timer's element.
     * @private
     */
    _timer;
    /**
     * @member {SVGRectElement} - The sender's element.
     * @private
     */
    _sender;
    /**
     * @member {SVGRectElement} - The receiver's element.
     * @private
     */
    _receiver;
    /**
     * @member {Map} - A map with packets as keys and SVGAnimationPair objects
     * as values.
     * @private
     */
    _packets = new Map();
    /**
     * @member {Animation} - The current animation of the sender's timer.
     * @private
     */
    _timerAnimation = null;

    /**
     * Creates a new PacketTrack.
     */
    constructor(){
        super();
        this.attachShadow({mode: "open"});
        const template = document.querySelector("#packet-track");
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this._rootSvg = this.shadowRoot.querySelector("#root");
        this._timer = this.shadowRoot.querySelector("#timer");
        this._sender = this.shadowRoot.querySelector("#sender");
        this._receiver = this.shadowRoot.querySelector("#receiver");
    }

    /**
     * Starts the timer animation in the sender side.
     * @param {number} duration - The duration of the timer.
     * @param {boolean} isNextSequence - true if the animation should be for
     * trying to send the next sequence.
     */
    startTimer(duration, isNextSequence=false){
        if(isNextSequence)
            this._timer.classList.add("next-sequence");
        else
            this._timer.classList.remove("next-sequence"); 
        const keyframes = [
            { visibility: "visible", strokeDashoffset: 0},
            { visibility: "hidden", strokeDashoffset: -157} // timerDiameter * PI = 157
        ];
        const animation = this._timer.animate(keyframes, {duration});
        this._timerAnimation = animation;
        animation.onfinish = () => {
            // Sometimes onfinish() is executed after a new timer animation
            // already began, and if we set to null the wrong animation
            // we will not be able to pause it.
            if(animation === this._timerAnimation)
                this._timerAnimation = null;
        };
    }

    /**
     * Stops the timer animation.
     */
    stopTimer(){
        this._timerAnimation?.finish();
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
        const {isAck, isCAck} = packet;
        const packetSvg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        packetSvg.setAttribute("x", 16);
        packetSvg.setAttribute("width", 68);
        packetSvg.setAttribute("height", 100);
        let pktClass;
        if(isAck)
            pktClass = isCAck? "cumulative-ack": "ack";
        else
            pktClass = "buffered";
        packetSvg.classList.add("pkt", "traveling", pktClass);
        packetSvg.onclick = event => this.onPacketClicked(packet, event.ctrlKey);
        this._rootSvg.append(packetSvg);
        const keyframes = [
            { visibility: "visible", transform: `translate(0px, ${isAck? 774 : 26}px)`},
            { visibility: "hidden", transform: `translate(0px,${isAck? 26 : 774}px)`}
        ];
        const animation = packetSvg.animate(keyframes, {duration: delay});
        this._packets.set(packet, new SVGAnimationPair(packetSvg, animation));
        animation.onfinish = () => {
            this._rootSvg.removeChild(packetSvg);
            this._packets.delete(packet);
        };
    }

    /**
     * A callback that is fired when a packet's svg is clicked.
     * @param {Packet} packet - The packet related to the svg.
     * @param {boolean} ctrlKey - true if ctrl was pressed while clicking the packet.
     */
    onPacketClicked(packet, ctrlKey){
        return
    }

    /**
     * Changes the receiver end to look like a confirmed packet.
     */
    packetConfirmed(){
        this._sender.classList.replace("buffered", "confirmed");
    }

    /**
     * Changes the sender end to look like a received packet.
     */
    packetReceived(){
        this._receiver.classList.replace("not-received", "received");
    }

    /**
     * Resets the component.
     */
    reset(){
        this._sender.classList.replace("confirmed", "buffered");
        this._receiver.classList.replace("received", "not-received");
        this.stopTimer();
        this._packets.forEach(({animation}) => animation.finish());
        this._packets.clear();
    }

    /**
     * Removes a packet after stopping it and showing it as
     * a lost packet for 200 ms.
     * @param {Packet} packet - The packet related to the svg.
     */
    losePacket(packet){
        const packetInfo = this._packets.get(packet);
        if(packetInfo !== undefined){
            packetInfo.animation.pause();
            packetInfo.svg.classList.add("lost");
            setTimeout(() => {
                packetInfo.animation.finish();
            }, 200);
        }
    }

    /**
     * Changes the appearance of a traveling packet to look
     * like a damaged packet.
     * @param {Packet} packet - The packet related to the svg.
     */
    damagePacket(packet){
        const packetInfo = this._packets.get(packet);
        packetInfo?.svg.classList.add("damaged");
    }

    /**
     * Pauses all the animations.
     */
    pause(){
        this._timerAnimation?.pause();
        this._packets.forEach(({animation}) => animation.pause());
    }

    /**
     * Resumes all the animations.
     */
    resume(){
        this._timerAnimation?.play();
        this._packets.forEach(({animation}) => animation.play());
    }
}
