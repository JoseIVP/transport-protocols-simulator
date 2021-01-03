// The position (index) of the first track to use for sending packets (positions
// start from 0)
const INITIAL_POSITION = 1;
// The maximum window size allowed
const MAX_WINDOW_SIZE = 40;
// The number of visible tracks in non-expanded and expanded mode
const VISIBLE_TRACKS = 16;
const EXPANDED_VISIBLE_TRACKS = MAX_WINDOW_SIZE + 2;
// The number of tracks to use for the visualization: this is the maximum number
// of visible tracks plus the maximum posible displacement of the visualization.
const TOTAL_TRACKS = EXPANDED_VISIBLE_TRACKS + (EXPANDED_VISIBLE_TRACKS - 1 - INITIAL_POSITION);

/**
 * A web component that shows a visualization of the packet interchange between
 * a sender and a receiver.
 */
export default class PacketVisualization extends HTMLElement {

    /**
     * @member {SVGForeignObjectElement} - The element that enables the
     * visualization to move and show the next tracks.
     * @private
     */
    _slidingView;
    /**
     * @member {number} - The x coordinate of the _slidingView.
     * @private
     */
    _slidingViewX = 0;
    /**
     * @member {SVGRectElement} - The element of the sender's window.
     * @private
     */
    _senderWindow;
    /**
     * @member {SVGRectElement} - The element of the receiver's window.
     * @private
     */
    _receiverWindow;
    /**
     * @member {Array} - An array of all the track containers
     * (SVGForeignObjectElement) from the visualization in document order.
     * @private
     */
    _trackContainers;
    /**
     * @member {number} - The index of the next container to use from
     * _trackContainers.
     * @private
     */
    _nextContainerIndex = INITIAL_POSITION;
    /**
     * @member {Array} - An array whose size is double the window size of the
     * current protocol, where we store track containers
     * (SVGForeignObjectElement) using sequence numbers as indices.
     * @private
     */
    _seqToTracksArray = null;
    /**
     * @member {number} - The delay of the packets.
     * @private
     */
    _delay;
    /**
     * @member {number} - The duration of the timeout of the sender.
     * @private
     */
    _timeout;
    /**
     * @member {number} - The size of the sender's window.
     * @private
     */
    _windowSize;
    /**
     * @member {SVGSVGElement} - The root element of the visualization.
     * @private
     */
    _rootSvg;
    /**
     * @member {SVGSVGElement} - The content of the sliding view.
     * @private
     */
    _slidingViewContent;
    /**
     * @member {SVGTextElement} - The tag of the sender portion at the top of
     * the visualization.
     * @private
     */
    _senderTag;
    /**
     * @member {SVGTextElment} - The tag of the receiver portion at the bottom
     * of the visualization.
     */
    _receiverTag;
    /**
     * @member {HTMLButtonElement} - The button for allowing to show or hide the
     * additional tracks of the visualization.
     * @private
     */
    _expandTracksBtn;
    /**
     * @member {boolean} - true if the additional tracks of the visualzation are
     * visible, false otherwise.
     * @private
     */
    _isExpanded = false;
    /**
     * @member {number} - The index from _trackContainers, of the left most
     * track of the visualization (which could be hidden).
     * @private
     */
    _leftMostTrackIndex = 0;
    /**
     * @member {number} - The index from _trackContainers, of the first visible
     * track from left to right in the visualization.
     * @private
     */
    _firstVisibleTrackIndex = 0;
    /**
     * @member {number} - The x coordinate of the last track of the
     * visualization.
     * @private
     */
    _lastTrackX = (TOTAL_TRACKS - 1) * 100;
    /**
     * @member {number} - The width in SVG coordinates of the visualization.
     * @private
     */
    _visualizationWidth = VISIBLE_TRACKS * 100;
    
    /**
     * Creates a new PacketVisualization instance.
     */
    constructor(){
        super();
        this.attachShadow({mode: "open"});
        const template = document.querySelector("#packet-visualization");
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this._slidingView = this.shadowRoot.querySelector("#sliding-view");
        this._senderWindow = this.shadowRoot.querySelector("#sender-window");
        this._receiverWindow = this.shadowRoot.querySelector("#receiver-window");
        // Create the tracks of the visualization
        const tracks = this.shadowRoot.querySelector("#tracks");
        for(let i=0; i<TOTAL_TRACKS; i++){
            const container = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
            container.setAttribute("height", 900);
            container.setAttribute("width", 100);
            const track = document.createElement("packet-track");
            container.append(track);
            tracks.append(container);
            container.setAttribute("x", i * 100);
        }
        this._trackContainers = Array.from(tracks.children);
        // Set the expanding behaviour for the tracks
        this._rootSvg = this.shadowRoot.querySelector("#root-svg");
        this._slidingViewContent = this.shadowRoot.querySelector("#sliding-view-content");
        this._senderTag = this.shadowRoot.querySelector("#sender-tag");
        this._receiverTag = this.shadowRoot.querySelector("#receiver-tag");
        this._rootSvg.onload = () => this._centerTags();
        this._expandTracksBtn = this.shadowRoot.querySelector("#toggle-expand-btn");
        this._expandTracksBtn.onclick = () => this._toggleExpandTracks();
    }
    
    /**
     * Resets the visualization.
     */
    reset(){
        this._seqToTracksArray = null;
        // Reset the tracks
        for(let i=0; i<TOTAL_TRACKS; i++){
            const container = this._trackContainers[i];
            container.firstElementChild.reset();
            container.setAttribute("x", i * 100);
        }
        this._leftMostTrackIndex = 0;
        this._firstVisibleTrackIndex = 0;
        this._lastTrackX = (TOTAL_TRACKS - 1) * 100;
        this._nextContainerIndex = INITIAL_POSITION;
        this._senderWindow.style.display = "none";
        this._receiverWindow.style.display = "none";
        this._senderWindow.setAttribute("x", INITIAL_POSITION * 100);
        this._receiverWindow.setAttribute("x", INITIAL_POSITION * 100);
        // Disable transition for reseting position
        this._slidingView.style.transition = null;
        this._slidingView.style.x = "0px";
        this._slidingViewX = 0;
    }

    /**
     * Centers the tags for the sender and the receiver.
     * @private
     */
    _centerTags(){
        this._senderTag.setAttribute("x", this._visualizationWidth / 2 - this._senderTag.getBBox().width / 2);
        this._receiverTag.setAttribute("x", this._visualizationWidth / 2 - this._receiverTag.getBBox().width / 2);
    }

    /**
     * Moves the hidden tracks from the left of the visualization to the last
     * positions of the right.
     */
    _rotateTracks(){
        for(let i=this._leftMostTrackIndex; i!=this._firstVisibleTrackIndex; i=(i+1)%TOTAL_TRACKS){
            const container = this._trackContainers[i];
            this._lastTrackX += 100;
            container.setAttribute("x", this._lastTrackX);
            container.firstElementChild.reset();
        }
        this._leftMostTrackIndex = this._firstVisibleTrackIndex;
    }

    /**
     * Moves the visualization to the left.
     * @param {number} spaces - The number of spaces in which to move.
     * @private
     */
    _move(spaces){
        if(spaces <= 0)
            return;
        this._rotateTracks();
        this._firstVisibleTrackIndex = (this._firstVisibleTrackIndex + spaces) % TOTAL_TRACKS;
        // Move the visualization
        this._slidingView.style.transition = `x ${spaces * 25}ms linear`;
        this._slidingViewX -= 100 * spaces;
        this._slidingView.style.x = this._slidingViewX + "px";
    }

    /**
     * Sets the parameters and initial conditions for the visualization. The
     * protocol number should be one of 1 = SW, 2 = GBN, 3 = SR or 4 = SR +
     * CACK. If protocol is 1 then windowSize is ignored.
     * @param {Object} params - The parameters to start the visualization.
     * @param {number} params.protocol - A number identifying the protocol.
     * @param {number} params.windowSize - The size of the sliding windows.
     * @param {number} params.delay - The duration for the packet sending
     * animation.
     * @param {number} params.timeout - The duration for the timeout animation.
     */
    setParams({
        protocol,
        windowSize,
        delay,
        timeout
    }){
        this._delay = delay;
        this._timeout = timeout;
        if(protocol === 1)
            windowSize = 1;
        else if(windowSize > MAX_WINDOW_SIZE)
            throw new Error(`The size of the window cannot be greater than ${MAX_WINDOW_SIZE}`);
        this._windowSize = windowSize;
        // Set initial mapping to correctly show acks for previous sequences
        this._seqToTracksArray = new Array(windowSize * 2);
        const lastSeqNum = windowSize * 2 - 1;
        this._seqToTracksArray[lastSeqNum] = this._trackContainers[INITIAL_POSITION - 1];
        if(protocol !== 1){
            // Show the windows
            this._senderWindow.style.display = "inline"
            this._senderWindow.setAttribute("width", windowSize * 100);
            if(protocol === 3 || protocol === 4){
                this._receiverWindow.style.display = "inline"
                this._receiverWindow.setAttribute("width", windowSize * 100);
            }
        }
    }

    /**
     * Starts the animation for sending a packet.
     * @param {Packet} packet - The packet for the animation.
     */
    sendPacket(packet){
        const {isAck, wasReSent} = packet;
        const seqNum = isAck? packet.ackNum : packet.seqNum;
        let trackContainer = null;
        if(isAck || wasReSent){
            // Reuse previously linked track
            trackContainer = this._seqToTracksArray[seqNum];
        }else{
            // Link a new track to the sequence number
            trackContainer = this._trackContainers[this._nextContainerIndex];
            this._seqToTracksArray[seqNum] = trackContainer;
            this._nextContainerIndex = (this._nextContainerIndex + 1) % TOTAL_TRACKS;
        }
        trackContainer.firstElementChild.sendPacket(packet, this._delay);
    }

    /**
     * Moves a window to the right.
     * @param {SVGRectElement} window - The window to move.
     * @param {number} spaces - The number of spaces in which to move the window.
     * @returns {number} - The new position of the window.
     * @private
     */
    _moveWindow(window, spaces){
        if(spaces <= 0)
            return;
        window.style.transition = `x ${spaces * 25}ms linear`;
        const x = Number.parseInt(window.getAttribute("x")) + spaces * 100;
        window.setAttribute("x", x);
        return x;
    }

    /**
     * Moves the visualization to the left if the end of the sender's window
     * reaches the end of the visualization.
     * @private
     */
    _checkVisualizationPosition(){
        const x = Number.parseInt(this._senderWindow.getAttribute("x"));
        if(x + this._windowSize * 100 >= this._visualizationWidth - this._slidingViewX)
            this._move((x + this._slidingViewX) / 100 - INITIAL_POSITION);
    }

    /**
     * Moves the sender window to the right.
     * @param {number} spaces - The number of spaces in which to move the window.
     */
    moveSenderWindow(spaces){
        this._moveWindow(this._senderWindow, spaces);
        this._checkVisualizationPosition();
    }

    /**
     * Moves the receiver window to the right.
     * @param {number} spaces - The number of spaces in which to move the window.
     */
    moveReceiverWindow(spaces){
        this._moveWindow(this._receiverWindow, spaces);
    }

    /**
     * Changes the visual representation of the sender's end corresponding to
     * sequence number seqNum, to look like a confirmed packet.
     * @param {number} seqNum - The confirmed sequence number.
     */
    packetConfirmed(seqNum){
        this._seqToTracksArray[seqNum].firstElementChild.packetConfirmed();
    }
    
    /**
     * Changes the visual representation of the receivers's end corresponding to
     * packet to look like a received packet.
     * @param {Packet} packet - The received packet.
     */
    packetReceived(packet){
        this._seqToTracksArray[packet.seqNum].firstElementChild.packetReceived();
    }

    /**
     * Removes the visual representation of a packet.
     * @param {Packet} packet - The packet whose visual representation to
     * remove.
     */
    removePacket(packet){
        const seqNum = packet.isAck? packet.ackNum : packet.seqNum;
        this._seqToTracksArray[seqNum].firstElementChild.losePacket(packet);
    }

    /**
     * Changes a packet to look like a damaged packet.
     * @param {Packet} packet - The packet whose visual representation to
     * change.
     */
    damagePacket(packet){
        const seqNum = packet.isAck? packet.ackNum : packet.seqNum;
        this._seqToTracksArray[seqNum].firstElementChild.damagePacket(packet);
    }

    /**
     * Sets onPacketClicked() callback to each track.
     */
    set onPacketClicked(callback){
        for(const container of this._trackContainers)
            container.firstElementChild.onPacketClicked = callback;
    }

    /**
     * Starts the timeout animation for the track related to seqNum.
     * @param {number} seqNum - The sequence number of the track.
     */
    startTimeout(seqNum){
        this._seqToTracksArray[seqNum].firstElementChild.startTimer(this._timeout);
    }

    /**
     * Stops the timeout animation for the track related to seqNum.
     * @param {number} seqNum - The sequence number of the track.
     */
    stopTimeout(seqNum){
        this._seqToTracksArray[seqNum].firstElementChild.stopTimer();
    }

    /**
     * Starts the animation of the timer for attempting to send the next
     * sequence number.
     * @param {number} duration - The duration of the timer.
     */
    startNextPacketTimer(duration){
        this._trackContainers[this._nextContainerIndex]
            .firstElementChild.startTimer(duration, true);
    }

    /**
     * Pauses the visualization's animations.
     */
    pause(){
        for(const container of this._trackContainers)
            container.firstElementChild.pause();
    }

    /**
     * Resumes the visualization's animations.
     */
    resume(){
        for(const container of this._trackContainers)
            container.firstElementChild.resume();
    }

    /**
     * Shows or hides additional tracks for the visualization.
     * @private
     */
    _toggleExpandTracks(){
        const {
            _rootSvg,
            _slidingViewContent,
            _expandTracksBtn
        } = this;
        if(this._isExpanded){
            const viewBox = `0 0 ${VISIBLE_TRACKS * 100} 900`;
            _rootSvg.setAttribute("viewBox", viewBox);
            _rootSvg.classList.remove("expanded");
            _slidingViewContent.setAttribute("viewBox", viewBox);
            _expandTracksBtn.classList.remove("expanded");
            this._visualizationWidth = VISIBLE_TRACKS * 100;
            this._isExpanded = false;
            // Move the visualization if necessary
            this._checkVisualizationPosition();
        }else{
            const viewBox = `0 0 ${EXPANDED_VISIBLE_TRACKS* 100} 900`;
            _rootSvg.setAttribute("viewBox", viewBox);
            _rootSvg.classList.add("expanded");
            _slidingViewContent.setAttribute("viewBox", viewBox);
            _expandTracksBtn.classList.add("expanded");
            this._visualizationWidth = EXPANDED_VISIBLE_TRACKS * 100;
            this._isExpanded = true;
        }
        this._centerTags();
    }
}
