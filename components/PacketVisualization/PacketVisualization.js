/**
 * A web component that shows a visualization of the packet
 * interchange between a sender and a receiver.
 */
export default class PacketVisualization extends HTMLElement {
    
    constructor(){
        super();
        this.attachShadow({mode: "open"});
        const template = document.getElementById("packet-visualization");
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.senderWindow = this.shadowRoot.querySelector(".sender.window");
        this.receiverWindow = this.shadowRoot.querySelector(".receiver.window");
        this.tracks = this.shadowRoot.querySelector("#tracks");
        this.reset();
    }

    /**
     * Moves the visualization to the left.
     * @param {number} spaces - A positive integer as the number of
     * spaces or tracks in which to move the visualization.
     */
    move(spaces){
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.moveWindow(-spaces);
                this.moveWindow(-spaces, true);
            });
        });
        const transitionTime = spaces * 50;
        let lastChildX = Number.parseInt(this.tracks.lastElementChild.getAttribute("x"));
        const children = [];
        for(let i=0; i<this.tracks.children.length; i++)
            children.push(this.tracks.children[i]);
        for(const container of children){
            container.style.transition = `x ${transitionTime}ms linear`;
            let x = Number.parseInt(container.getAttribute("x"));
            if(x < 0){
                lastChildX = lastChildX + 100
                x = lastChildX;
                container.setAttribute("x", x);
                this.tracks.appendChild(container);
                // Unlink tracks out of sight
                if (this.protocol !== 1){
                    this.trackContainers.delete(container.seqNum);
                    delete container.seqNum;
                }
                container.children[0].reset();
            }
            // We call this twice for the browser
            // to notice the change in position
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    container.setAttribute("x", x - 100 * spaces);
                })
            });
        }
    }

    /**
     * Set the parameters and initial conditions for the visualization.
     * @param {Object} params - The options to start the visualization.
     * @param {number} protocol - A number identifying the protocol.
     * @param {Map} params.initialMapping - The initial mapping from sequence numbers to track positions.
     * @param {number} params.nextTrackPosition - The initial next track to send a packet.
     * @param {number} params.senderPosition - The initial position for the sender window.
     * @param {number} params.receiverPosition - The initial position for the receiver window.
     * @param {number} params.senderSize - The size of the sender window.
     * @param {number} params.receiverSize - The size of the receiver window.
     * @param {number} params.delay - The duration for the packet sending animation.
     * @param {number} params.timeout - The duration for the timer animation.
     */
    setParams({
        protocol, // 1 = SW, 2 = GBN, 3 = SR
        initialMapping = null,
        nextTrackPosition = 2,
        senderPosition = 2,
        receiverPosition =2,
        senderSize = 0,
        receiverSize = 0,
        delay = 1000,
        timeout = 2500
    }={}){
        this.senderSize = senderSize;
        this.protocol = protocol;
        this.delay = delay;
        this.timeout = timeout;
        if(initialMapping !== null){
            for(const [seqNumber, trackPosition] of initialMapping)
                this.trackContainers.set(seqNumber, this.tracks.children[trackPosition])
        }
        this.nextTrackContainer = this.tracks.children[nextTrackPosition];
        if(senderSize !== 0){
            this.senderWindow.style.display = "inline"
            this.senderWindow.setAttribute("width", senderSize * 100);
            this.senderWindow.setAttribute("x", senderPosition * 100);
        }
        if(receiverSize !== 0){
            this.receiverWindow.style.display = "inline"
            this.receiverWindow.setAttribute("width", receiverSize * 100);
            this.receiverWindow.setAttribute("x", receiverPosition * 100);
        }
    }

    /**
     * Reset the visualization rendering to only show
     * the packet tracks without the windows.
     */
    reset(){
        this.trackContainers = new Map();
        this.nextTrackContainer = null;
        this.senderWindow.style.display = "none";
        this.receiverWindow.style.display = "none";
        this.tracks.innerHTML = "";
        for(let i=0; i<36; i++){
            const trackContainer = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
            trackContainer.setAttribute("height", 900);
            trackContainer.setAttribute("width", 100);
            trackContainer.setAttribute("x", i * 100);
            const track = document.createElement("packet-track");
            trackContainer.appendChild(track);
            this.tracks.appendChild(trackContainer);
        }
    }

    /**
     * Start an animation for sending a packet.
     * @param {Packet} packet - The packet for the animation.
     */
    sendPacket(packet){
        const {isAck, wasReSent} = packet;
        const seqNum = isAck? packet.ackNum : packet.seqNum;
        let trackContainer = null;
        if(isAck || wasReSent){
            trackContainer = this.trackContainers.get(seqNum);
            if(trackContainer === undefined)
                // The track is out of sight
                return;
        }else{
            trackContainer = this.nextTrackContainer;
            this.nextTrackContainer = trackContainer.nextElementSibling;
            this.trackContainers.set(seqNum, trackContainer);
            trackContainer.seqNum = seqNum;
            if (this.protocol === 1){
                if(Number.parseInt(this.nextTrackContainer.getAttribute("x")) >= 1500)
                    this.move(12);
            }else{
                const windowPosition = (Number.parseInt(this.senderWindow.getAttribute("x")));
                if((windowPosition + this.senderSize * 100) >= 1400){
                    this.move(windowPosition / 100 - 1);
                }
            }
            if(Number.parseInt(this.nextTrackContainer.getAttribute("x")) >= 1500 ||
                (Number.parseInt(this.senderWindow.getAttribute("x")) + this.senderWindow * 100))
                this.move(12);
        }
        const track = trackContainer.children[0];
        track.sendPacket(packet, this.delay, isAck);
    }

    /**
     * Move the sliding window.
     * @param {number} spaces - The number of spaces in which to move the window.
     * @param {boolean} [moveReceiver=false] - True to move the receiver window, false to move the sender's.
     */
    moveWindow(spaces, moveReceiver=false){
        const transitionTime = Math.abs(spaces) * 50;
        const window = moveReceiver ? this.receiverWindow : this.senderWindow;
        window.style.transition = `x ${transitionTime}ms linear`;
        const x = Number.parseInt(window.getAttribute("x"));
        window.setAttribute("x", x + spaces * 100);
    }

    /**
     * Change the visual representation of the sender's end packet
     * corresponding to <packet> to look like a confirmed packet.
     * @param {number} packet
     */
    packetConfirmed(packet){
        if(this.protocol === 2){
            for(const [seqNum, container] of this.trackContainers){
                if(seqNum === -1)
                    continue;
                if(seqNum <= packet.ackNum)
                    container.children[0].packetConfirmed();
            }
        }else{
            const trackContainer = this.trackContainers.get(packet.ackNum);
            trackContainer?.children[0].packetConfirmed();
        }
    }
    
    /**
     * Change the visual representation of the receivers's end packet
     * corresponding to <packet> to look like a received packet.
     * @param {Packet} packet
     */
    packetReceived(packet){
        const trackContainer = this.trackContainers.get(packet.seqNum);
        trackContainer?.children[0].packetReceived();
    }

    /**
     * Remove the visual representation of a packet.
     * @param {Packet} packet
     */
    removePacket(packet){
        const seqNum = packet.isAck? packet.ackNum : packet.seqNum;
        const trackContainer = this.trackContainers.get(seqNum);
        if(trackContainer !== undefined)
            trackContainer.children[0].removePacket(packet);
    }

    /**
     * Sets onPacketClicked() callback to each track.
     */
    set onPacketClicked(callback){
        for(const container of this.tracks.children){
            container.children[0].onPacketClicked = callback;
        }
    }

    /**
     * Start the timer for the track related to seqNum.
     * @param {number} seqNum - The sequence number of the track.
     */
    startTimeout(seqNum){
        const container = this.trackContainers.get(seqNum);
        if(container !== undefined){
            container.children[0].startTimer(this.timeout);
        }
    }

    /**
     * Stop the timer for the track related to seqNum.
     * @param {number} seqNum - The sequence number of the track.
     */
    stopTimeout(seqNum){
        const container = this.trackContainers.get(seqNum);
        if(container !== undefined){
            container.children[0].stopTimer();
        }
    }

    /**
     * Start the animation of the timer for attempting to send
     * the next sequence number.
     * @param {number} duration - The duration of the timer.
     */
    startNextPacketTimer(duration){
        if(this.nextTrackContainer !== undefined){
            this.nextTrackContainer.children[0].startTimer(duration, true);
        }
    }
}
