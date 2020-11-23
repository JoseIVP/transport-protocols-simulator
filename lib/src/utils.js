/** @module utils  */

/**
 * A class that represents a timeout.
 */
export class Timeout{
    
    // The different states of the timeout
    static _RUNNING = 0;
    static _PAUSED = 1;
    static _STOPPED = 2;
    static _ENDED = 3;
    
    /**
     * Creates and starts a new timeout.
     * @param {number} duration - The duration of the timeout in miliseconds.
     * @param {function} callback - The callback to execute when the timeout is completed.
     * @param {boolean} [repeat=false] - true if the timeout should repeat like an interval.
     */
    constructor(duration, callback, repeat=false){
        this._duration = duration;
        this._elapsedTime = 0;
        this._callback = callback;
        this._repeat = repeat;
        this._start(duration);
    }

    /**
     * Starts or resumes the timeout.
     * @param {number} duration - The duration of the timeout.
     * @private
     */
    _start(duration){
        this._state = Timeout._RUNNING;
        this._timeoutId = setTimeout(() => {
            if(this._repeat){
                this._timeoutId = setInterval(() => {
                    this._elapsedTime = 0;
                    this._resumeTime = Date.now();
                    this._callback();
                }, this._duration);
                this._elapsedTime = 0;
                this._resumeTime = Date.now();
                this._callback();
            }else{
                this._state = Timeout._ENDED;
                this._callback();
            }
        }, duration);
        this._resumeTime = Date.now();
    }

    /**
     * Stops the timeout. After this, the timeout cannot
     * be resumed.
     */
    stop(){
        if(this._state == Timeout._RUNNING){
            clearTimeout(this._timeoutId);
            this._state = Timeout._STOPPED; 
        }
    }

    /**
     * Pauses the timeout.
     */
    pause(){
        if(this._state == Timeout._RUNNING){
            clearTimeout(this._timeoutId);
            this._elapsedTime += Date.now() - this._resumeTime;
            this._state = Timeout._PAUSED;  
        }
        
    }
    
    /**
     * Resumes the timeout if it is paused.
     */
    resume(){
        if(this._state == Timeout._PAUSED){
            const time = this._duration - this._elapsedTime;
            this._start(time < 0 ? 0 : time);
        }
    }
}


/**
 * A class that helps compute statistics for the packets
 * sent between a sender and a receiver.
 */
export class StatsComputer{

    // Current interval count of packets
    _currentPacketsSent = 0;
    _currentPacketsReceived = 0;
    _currentPacketsReceivedOk = 0;
    _currentPacketsReSent = 0;
    _currentAcksSent = 0;
    _currentAcksReceived = 0;
    _currentAcksReceivedOk = 0;
    
    // Last interval count
    _packetsSent = 0;
    _packetsReceived = 0;
    _packetsReceivedOk = 0;
    _packetsReSent = 0;
    _acksSent = 0;
    _acksReceived = 0;
    _acksReceivedOk = 0;

    // Cumulative count of packets
    _totalPacketsSent = 0;
    _totalPacketsReceived = 0;
    _totalPacketsReceivedOk = 0;
    _totalPacketsReSent = 0;
    _totalAcksSent = 0;
    _totalAcksReceived = 0;
    _totalAcksReceivedOk = 0;

    _interval = null;
    _updateTime = null;
    _elapsedTime = 0;

    /**
     * Starts a new StatsComputer object. The generated statistics will be
     * updated every updateTime miliseconds.
     * @param {number} updateTime - The interval time for computing and updating the statistics.
     */
    constructor(updateTime){
        this._updateTime = updateTime;
        this._interval = new Timeout(updateTime, () => {
            this._update();
        }, true);
    }
    
    /** 
     * @member {number} - The time since the start (creation of the object) till
     * the last iterval, in miliseconds. This is a multiple of the time given to
     * the constructor.
     * */
    get elapsedTime () { return this._elapsedTime; }

    /**  @member {number} - The total packets sent by the sender. */
    get totalPacketsSent(){ return this._totalPacketsSent; }
    /** @member {number} - The total packets received by the receiver. */
    get totalPacketsReceived(){ return this._totalPacketsReceived; }
    /** 
     * @member {number} - The total number of correct packets received by the
     * receiver. The definition of a correcly received packet depends on each
     * protocol.
     */
    get totalPacketsReceivedOk(){ return this._totalPacketsReceivedOk; }
    /** @member {number} - The total number of packets re-sent by the sender. */
    get totalPacketsReSent(){ return this._totalPacketsReSent; }
    /** @member {number} - The total number of acknowledgments sent by the receiver. */
    get totalAcksSent(){ return this._totalAcksSent; }
    /** @member {number} - The total number of acknowledgments received by the sender. */
    get totalAcksReceived(){ return this._totalAcksReceived; }
    /** @member {number} - The total number of acknowledgments correctly received by the sender. */
    get totalAcksReceivedOk(){ return this._totalAcksReceivedOk; }

    /** 
     * @member {number} - The number of packets sent by the sender in the last
     * interval divided by updateTime converted to seconds.
     */
    get packetsSentPerSecond() { return this._packetsSent / this._updateTime * 1000; }
    /** 
     * @member {number} - The number of packets received by the receiver in the
     * last interval divided by updateTime converted to seconds.
     */
    get packetsReceivedPerSecond(){ return this._packetsReceived / this._updateTime * 1000; }
    /** 
     * @member {number} - The number of packets correctly received by the
     * receiver in the last interval divided by updateTime converted to seconds.
     */
    get packetsReceivedOkPerSecond(){ return this._packetsReceivedOk / this._updateTime * 1000; }
    /** 
     * @member {number} - The number of packets re-sent by the sender in the
     * last interval divided by updateTime converted to seconds.
     */
    get packetsReSentPerSecond(){ return this._packetsReSent / this._updateTime * 1000; }
    /** 
     * @member {number} - The number of acknowledgments sent by the receiver in
     * the last interval divided by updateTime converted to seconds.
     */
    get acksSentPerSecond(){ return this._acksSent / this._updateTime * 1000; }
    /** 
     * @member {number} - The number of acknowledgments received by the sender
     * in the last interval divided by updateTime converted to seconds.
     */
    get acksReceivedPerSecond(){ return this._acksReceived / this._updateTime * 1000; }
    /** 
     * @member {number} - The number of acknowledgments correctly received by
     * the sender in the last interval divided by updateTime converted to
     * seconds.
     */
    get acksReceivedOkPerSecond(){ return this._acksReceivedOk / this._updateTime * 1000; }

    /**
     * @member {number} - The total number of packets sent by the sender since
     * the start, divided by elapsedTime converted to seconds.
     */
    get totalPacketsSentPerSecond(){ return this._totalPacketsSent / this._elapsedTime * 1000; }
    /**
     * @member {number} - The total number of packets received by the receiver
     * since the start, divided by elapsedTime converted to seconds.
     */
    get totalPacketsReceivedPerSecond(){ return this._totalPacketsReceived / this._elapsedTime * 1000; }
    /**
     * @member {number} - The total number of packets correctly received by the
     * receiver since the start, divided by elapsedTime converted to seconds.
     */
    get totalPacketsReceivedOkPerSecond(){ return this._totalPacketsReceivedOk / this._elapsedTime * 1000; }
    /**
     * @member {number} - The total number of packets re-sent by the sender
     * since the start, divided by elapsedTime converted to seconds.
     */
    get totalPacketsReSentPerSecond(){ return this._totalPacketsReSent / this._elapsedTime * 1000; }
    /**
     * @member {number} - The total number of acknowledgments sent by the
     * receiver since the start, divided by elapsedTime converted to seconds.
     */
    get totalAcksSentPerSecond(){ return this._totalAcksSent / this._elapsedTime * 1000; }
    /**
     * @member {number} - The total number of acknowledgments received by the
     * sender since the start, divided by elapsedTime converted to seconds.
     */
    get totalAcksReceivedPerSecond(){ return this._totalAcksReceived / this._elapsedTime * 1000; }
    /**
     * @member {number} - The total number of acknowledgments correctly received
     * by the sender since the start, divided by elapsedTime converted to
     * seconds.
     */
    get totalAcksReceivedOkPerSecond(){ return this._totalAcksReceivedOk / this._elapsedTime * 1000; }


    _update(){
        this._elapsedTime += this._updateTime;
        // Update cumulative variables
        this._totalPacketsSent += this._currentPacketsSent;
        this._totalPacketsReceived += this._currentPacketsReceived;
        this._totalPacketsReceivedOk += this._currentPacketsReceivedOk;
        this._totalPacketsReSent += this._currentPacketsReSent;
        this._totalAcksSent += this._currentAcksSent;
        this._totalAcksReceived += this._currentAcksReceived;
        this._totalAcksReceivedOk += this._currentAcksReceivedOk;
        // Update last interval variables
        this._packetsSent = this._currentPacketsSent;
        this._packetsReceived = this._currentPacketsReceived;
        this._packetsReceivedOk = this._currentPacketsReceivedOk;
        this._packetsReSent = this._currentPacketsReSent;
        this._acksSent = this._currentAcksSent;
        this._acksReceived = this._currentAcksReceived;
        this._acksReceivedOk = this._currentAcksReceivedOk;
        // Reset current count of packets
        this._currentPacketsSent = 0;
        this._currentPacketsReceived = 0;
        this._currentPacketsReceivedOk = 0;
        this._currentPacketsReSent = 0;
        this._currentAcksSent = 0;
        this._currentAcksReceived = 0;
        this._currentAcksReceivedOk = 0;
        this.onUpdate();
    }

    /**
     * Override this method to perform an action every time the
     * statistics are updated.
     */
    onUpdate(){
        return;
    }

    /**
     * Count and clasify a packet sent by a sender or a receiver.
     * @param {Packet} packet - The packet to add to the statistics.
     */
    packetSent(packet){
        if(packet.isAck){
            this._currentAcksSent++;
        }else{
            this._currentPacketsSent++;
            if(packet.wasReSent)
                this._currentPacketsReSent++;
        }
    }

    /**
     * Count and clasify a packet received by a sender or a receiver.
     * @param {Packet} packet - The packet to add to the statistics.
     * @param {boolean} isOK - true if the packet was correctly received by the node.
     */
    packetReceived(packet, isOK){
        if(packet.isAck){
            this._currentAcksReceived++;
            if(isOK)
                this._currentAcksReceivedOk++;
        }else{
            this._currentPacketsReceived++;
            if(isOK)
                this._currentPacketsReceivedOk++;
        }
    }

    /**
     * Pause the computing.
     */
    pause(){
        this._interval.pause();
    }

    /**
     * Resume the computing.
     */
    resume(){
        this._interval.resume();
    }

    /**
     * Stop the computing.
     */
    stop(){
        this._interval.stop();
    }
}