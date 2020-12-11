/**
 * A web component that shows a visualization of the packet
 * interchange between a sender and a receiver.
 */
export default class PacketVisualization extends HTMLElement {
    
    constructor(){
        super();
        this.attachShadow({mode: "open"});
        const template = document.querySelector("#packet-visualization");
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.senderWindow = this.shadowRoot.querySelector("#sender-window");
        this.receiverWindow = this.shadowRoot.querySelector("#receiver-window");
        this.tracks = this.shadowRoot.querySelector("#tracks");
        this.expandTracksBtn = this.shadowRoot.querySelector("#expand-tracks-btn");
        this.rootSvg = this.shadowRoot.querySelector("#root-svg");
        this.senderTag = this.shadowRoot.querySelector("#sender-tag");
        this.receiverTag = this.shadowRoot.querySelector("#receiver-tag");
        this.isExpanded = false;
        this.returnLimit = 800;
        this.expandTracksBtn.onclick = () => this._toggleExpandTracks();
        this._init();
    }

    /**
     * Sets the initial state of the component.
     * @param {boolean} reset - true to reset the component.
     */
    _init(reset=false){
        this.windowSize = null;
        this.protocol = null;
        this.delay = null;
        this.timeout = null;
        // Maps sequence numbers to track containers
        this.trackContainers = new Map();
        this.senderWindow.style.display = "none";
        this.receiverWindow.style.display = "none";
        // Put double the number of visible tracks
        for(let i=0; i< 96; i++){
            let trackContainer;
            if(reset){
                // Reset track containers
                trackContainer = this.tracks.children[i];
                trackContainer.firstElementChild.reset();
                // Prevent animation when reseting position
                trackContainer.style.transition = null;
            }else{
                // We put track components inside foreignObject as
                // SVG does not accept web components
                trackContainer = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
                trackContainer.setAttribute("height", 900);
                trackContainer.setAttribute("width", 100);
                const track = document.createElement("packet-track");
                trackContainer.append(track);
                this.tracks.append(trackContainer);
            }
            trackContainer.seqNum = null;
            trackContainer.setAttribute("x", i * 100);
        }
        const initialPosition = 1;
        // The container for the next sequence number
        this.nextTrackContainer = this.tracks.children[initialPosition];
        this.senderWindow.setAttribute("x", initialPosition * 100);
        this.receiverWindow.setAttribute("x", initialPosition * 100);
    }

    /**
     * Resets the component.
     */
    reset(){
        this._init(true);
    }

    /**
     * Moves the visualization to the left.
     * @param {number} spaces - Number of spaces to move.
     */
    move(spaces){
        if(spaces === 0)
            return;
        const transition= `x ${spaces * 25}ms linear`;
        let lastChildX = Number.parseInt(this.tracks.lastElementChild.getAttribute("x"));
        // Make a copy, as we may modify children positions
        const children = Array.from(this.tracks.children);
        for(const container of children){
            container.style.transition = transition;
            let containerX = Number.parseInt(container.getAttribute("x"));
            if(containerX < 0){
                // Move the container to the end
                lastChildX += 100
                containerX = lastChildX;
                container.setAttribute("x", containerX);
                this.tracks.append(container);
                container.firstElementChild.reset();
                // TODO: remove this part
                // if (this.protocol !== 1){
                //     // For GBN and SR, detach containers from sequence
                //     // numbers as we do not use a finite number of sequences
                //     this.trackContainers.delete(container.seqNum);
                //     container.seqNum = null;
                // }
            }
            // Make the browser see the change in position for
            // containers sent to the end and sync the begining of
            // the animation with the other containers
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    container.setAttribute("x", containerX - 100 * spaces);
                });
            });
        }
        // Sync the begining of the window animation with the containers
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.moveWindow(-spaces);
                this.moveWindow(-spaces, true);
            });
        });
    }

    /**
     * Set the parameters and initial conditions for the visualization. The
     * protocol number should be one of 1 = SW, 2 = GBN or 3 = SR.
     * @param {Object} params - The parameters to start the visualization.
     * @param {number} params.protocol - A number identifying the protocol.
     * @param {number} params.windowSize - The size of the sliding windows.
     * @param {number} params.delay - The duration for the packet sending animation.
     * @param {number} params.timeout - The duration for the timer animation.
     */
    setParams({
        protocol = 1,
        windowSize = 0,
        delay = 1000,
        timeout = 2500
    }={}){
        this.windowSize = windowSize;
        this.protocol = protocol;
        this.delay = delay;
        this.timeout = timeout;
        // Set initial sequence number to track container mapping
        if(protocol === 1)
            this.trackContainers.set(1, this.tracks.children[0]);
        else if(protocol === 2 || protocol === 4)
            this.trackContainers.set(windowSize * 2 - 1, this.tracks.children[0]);
        if(protocol !== 1){
            this.senderWindow.style.display = "inline"
            this.senderWindow.setAttribute("width", windowSize * 100);
            if(protocol === 3 || protocol === 4){
                this.receiverWindow.style.display = "inline"
                this.receiverWindow.setAttribute("width", windowSize * 100);
            }
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
                const nexContainerPosition = Number.parseInt(this.nextTrackContainer.getAttribute("x"));
                if(nexContainerPosition >= this.returnLimit)
                    this.move(nexContainerPosition / 100 - 2);
            }else{
                const windowPosition = Number.parseInt(this.senderWindow.getAttribute("x"));
                if(windowPosition >= this.returnLimit)
                    this.move(windowPosition / 100);
            }
        }
        trackContainer.firstElementChild.sendPacket(packet, this.delay);
    }

    /**
     * Move the sliding window. Use positive space numbers to move to the right and
     * negative to move to the left.
     * @param {number} spaces - The number of spaces in which to move the window.
     * @param {boolean} [moveReceiver=false] - True to move the receiver window, false to move the sender's.
     */
    moveWindow(spaces, moveReceiver=false){
        if(spaces === 0)
            return;
        const transitionTime = Math.abs(spaces) * 25;
        const window = moveReceiver ? this.receiverWindow : this.senderWindow;
        window.style.transition = `x ${transitionTime}ms linear`;
        const x = Number.parseInt(window.getAttribute("x"));
        window.setAttribute("x", x + spaces * 100);
    }

    /**
     * Change the visual representation of the sender's end
     * corresponding to packet, to look like a confirmed packet.
     * @param {number} packet
     */
    packetConfirmed(seqNum){
        const trackContainer = this.trackContainers.get(seqNum);
        trackContainer?.firstElementChild.packetConfirmed();
    }
    
    /**
     * Change the visual representation of the receivers's end
     * corresponding to packet to look like a received packet.
     * @param {Packet} packet
     */
    packetReceived(packet){
        const trackContainer = this.trackContainers.get(packet.seqNum);
        trackContainer?.firstElementChild.packetReceived();
    }

    /**
     * Remove the visual representation of a packet.
     * @param {Packet} packet
     */
    removePacket(packet){
        const seqNum = packet.isAck? packet.ackNum : packet.seqNum;
        const trackContainer = this.trackContainers.get(seqNum);
        trackContainer?.firstElementChild.losePacket(packet);
    }

    /**
     * Change a packet to look like a damaged packet.
     * @param {Packet} packet 
     */
    damagePacket(packet){
        const seqNum = packet.isAck? packet.ackNum : packet.seqNum;
        const trackContainer = this.trackContainers.get(seqNum);
        trackContainer?.firstElementChild.damagePacket(packet);
    }

    /**
     * Sets onPacketClicked() callback to each track.
     */
    set onPacketClicked(callback){
        for(const container of this.tracks.children)
            container.firstElementChild.onPacketClicked = callback;
    }

    /**
     * Start the timer for the track related to seqNum.
     * @param {number} seqNum - The sequence number of the track.
     */
    startTimeout(seqNum){
        const container = this.trackContainers.get(seqNum);
        container?.firstElementChild.startTimer(this.timeout);
    }

    /**
     * Stop the timer for the track related to seqNum.
     * @param {number} seqNum - The sequence number of the track.
     */
    stopTimeout(seqNum){
        const container = this.trackContainers.get(seqNum);
        container?.firstElementChild.stopTimer();
    }

    /**
     * Start the animation of the timer for attempting to send
     * the next sequence number.
     * @param {number} duration - The duration of the timer.
     */
    startNextPacketTimer(duration){
        this.nextTrackContainer?.firstElementChild.startTimer(duration, true);
    }

    /**
     * Pauses the visualization animations.
     */
    pause(){
        for(const container of this.tracks.children)
            container.firstElementChild.pause();
    }

    /**
     * Resumes the visualization animations.
     */
    resume(){
        for(const container of this.tracks.children)
            container.firstElementChild.resume();
    }

    /**
     * Show or hide additional tracks of the visualization.
     * @private
     */
    _toggleExpandTracks(){
        if(this.isExpanded){
            this.rootSvg.setAttribute("viewBox", "0 0 1600 900");
            this.rootSvg.classList.remove("expanded");
            this.senderTag.setAttribute("x", 540);
            this.receiverTag.setAttribute("x", 480);
            this.expandTracksBtn.classList.remove("expanded");
            this.returnLimit = 800;
            this.isExpanded = false;
        }else{
            this.rootSvg.setAttribute("viewBox", "0 0 4200 900");
            this.rootSvg.classList.add("expanded");
            this.senderTag.setAttribute("x", 1940);
            this.receiverTag.setAttribute("x", 1880); 
            this.expandTracksBtn.classList.add("expanded");
            this.returnLimit = 2100;
            this.isExpanded = true;
        }
    }
}
