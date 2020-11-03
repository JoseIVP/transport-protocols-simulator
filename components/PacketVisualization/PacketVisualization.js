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
        this.moveWindow(-spaces);
        this.moveWindow(-spaces, true);
        const transitionTime = spaces * 100;
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
                this.trackContainers.delete(container.dataset.seqNumber);
            }
            // We call this twice for the browser
            // to notice the change in position
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    container.setAttribute("x", x - 100 * spaces);
                })
            })
        }
    }

    /**
     * Set the parameters and initial conditions for the visualization.
     * @param {Object} params - The options to start the visualization.
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
        initialMapping = null,
        nextTrackPosition = 2,
        senderPosition = 2,
        receiverPosition =2,
        senderSize = 0,
        receiverSize = 0,
        delay = 1000,
        timeout = 1500
    }={}){
        this.delay = delay;
        this.timeout = timeout;
        if(initialMapping !== null){
            for([seqNumber, trackPosition] of initialMapping)
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
        for(let i=0; i<27; i++){
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
     * Play the animation for sending a packet from sender to receiver (isAck = false)
     * or from receiver to sender (isAck = true).
     * @param {Object} options - The options for the packet to send.
     * @param {number} options.seqNumber - The packet sequence number, that tells which track to use.
     * @param {number} options.id - The packet id with which to link the visual representation.
     * @param {boolean} [options.startTimer=false] - True if the timer animation should also be played.
     * @param {boolean} [options.resend=false] - True if the packet corresponds to a resent sequence number.
     * @param {boolean} [options.isAck=false] - True if the packet is an acknowledgment and the representation
     * should be a packet traveling from receiver to sender, false otherwise.
     */
    sendPacket({
        seqNumber,
        id,
        startTimer = false,
        resend = false,
        isAck = false
    }){
        let trackContainer = null;
        if(resend){
            trackContainer = this.trackContainers.get(seqNumber);
            if(trackContainer === undefined)
                // The track is out of sight
                return;
        }else{
            trackContainer = this.nextTrackContainer;
            this.nextTrackContainer = trackContainer.nextElementSibling;
            this.trackContainers.set(seqNumber, trackContainer);
            trackContainer.dataset.seqNumber = seqNumber;
            if(Number.parseInt(this.nextTrackContainer.getAttribute("x")) >= 900)
                this.move(7);
        }
        const track = trackContainer.children[0];
        track.sendPacket(id, this.delay, isAck);
        if(startTimer)
            track.startTimer(this.timeout);
    }

    /**
     * Move the sliding window.
     * @param {number} spaces - The number of spaces in which to move the window.
     * @param {*} [isReceiver=false] - True if the receiver window should be moved, false to move the sender window.
     */
    moveWindow(spaces, isReceiver=false){
        const transitionTime = Math.abs(spaces) * 100;
        const window = isReceiver ? this.receiverWindow : this.senderWindow;
        window.style.transition = `x ${transitionTime}ms linear`;
        const x = Number.parseInt(window.getAttribute("x"));
        window.setAttribute("x", x + spaces * 100);
    }

    /**
     * Change the visual representation of the sender's end packet
     * corresponding to seqNumber to look like a confirmed packet.
     * @param {number} seqNumber - The sequence number of the packet. 
     */
    packetConfirmed(seqNumber){
        const trackContainer = this.trackContainers.get(seqNumber);
        trackContainer.children[0].packetConfirmed();
    }
    
    /**
     * Change the visual representation of the receivers's end packet
     * corresponding to seqNumber to look like a received packet.
     * @param {number} seqNumber - The sequence number of the packet. 
     */
    packetReceived(seqNumber){
        const trackContainer = this.trackContainers.get(seqNumber);
        trackContainer.children[0].packetReceived();
    }

    /**
     * Remove the visual representation of a packet.
     * @param {number} seqNumber - The sequence number of the packet to remove.
     * @param {number} id - The id of the packet to remove.
     */
    removePacket(seqNumber, id){
        const trackContainer = this.trackContainers.get(seqNumber);
        if(trackContainer !== undefined)
            trackContainer.children[0].remove(id);
    }
}
