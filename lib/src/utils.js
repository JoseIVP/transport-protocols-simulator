/** @module utils  */

/**
 * A class that represents a timeout or interval.
 */
export class Timeout{
    
    // The different states of the timeout
    static _RUNNING = 0;
    static _PAUSED = 1;
    static _STOPPED = 2;
    static _FINISHED = 3;

    /**
     * @member {number} - The state of the timeout.
     * @private
     */
    _state;
    /**
     * @member {number} - The duration of the timeout or interval.
     * @private
     */
    _duration;
    /**
     * @member {number} - The elapsed time since the start of the timeout or a
     * cycle of the interval.
     * @private
     */
    _elapsedTime = 0;
    /**
     * @member {function} - The function to call for when the timeout or a cicle
     * of the interval finishes.
     * @private
     */
    _callback;
    /**
     * @member {boolean} - true if the instance is an interval and should
     * repeat.
     * @private
     */
    _repeat;
    /**
     * @member {number} - The ID of the current timeout or interval.
     * @private
     */
    _timeoutID;
    /**
     * @member {number} - The time in miliseconds when the execution of the
     * timeout was started or resumed.
     * @private
     */
    _resumeTime;
    
    
    /**
     * Creates and starts a new timeout.
     * @param {number} duration - The duration of the timeout in miliseconds.
     * @param {function} callback - The callback to execute when the timeout is
     * completed.
     * @param {boolean} [repeat=false] - true if the timeout should repeat like
     * an interval.
     */
    constructor(duration, callback, repeat=false){
        this._duration = duration;
        this._callback = callback;
        this._repeat = repeat;
        this._start(duration);
    }

    /**
     * Executes one cycle of the interval.
     * @private
     */
    _intervalCall(){
        this._elapsedTime = 0;
        this._resumeTime = Date.now();
        this._callback();
    }

    /**
     * Starts or resumes the timeout.
     * @param {number} duration - The duration of the timeout.
     * @private
     */
    _start(duration){
        // The first call or cycle is always a timeout, even if the instance is
        // an interval, this helps regain the execution of the timeout or
        // interval when it's paused.
        this._state = Timeout._RUNNING;
        this._timeoutID = setTimeout(() => {
            if(this._repeat){
                // Transition to use setInterval()
                this._timeoutID = setInterval(() => {
                    this._intervalCall();
                }, this._duration);
                this._intervalCall();
            }else{
                this._state = Timeout._FINISHED;
                this._callback();
            }
        }, duration);
        this._resumeTime = Date.now();
    }

    /**
     * Returns true if the timeout is finished, false otherwise.
     * @returns {boolean}
     */
    isFinished(){
        return this._state == Timeout._FINISHED;
    }

    /**
     * Returns true if the timeout is running, false otherwise.
     * @returns {boolean}
     */
    isRunning(){
        return this._state == Timeout._RUNNING;
    }
        
    /**
     * Returns true if the timeout is paused, false otherwise.
     * @returns {boolean}
     */
    isPaused(){
        return this._state == Timeout._PAUSED;
    }

    /**
     * Returns true if the timeout is stopped, false otherwise.
     * @returns {boolean}
     */
    isStopped(){
        return this._state == Timeout._STOPPED;
    }

    /**
     * Stops the timeout if it is not finished. After this, the
     * timeout cannot be resumed.
     */
    stop(){
        if(!this.isFinished()){
            clearTimeout(this._timeoutID);
            this._state = Timeout._STOPPED; 
        }
    }

    /**
     * Pauses the timeout if it is running.
     */
    pause(){
        if(this.isRunning()){
            clearTimeout(this._timeoutID);
            this._elapsedTime += Date.now() - this._resumeTime;
            this._state = Timeout._PAUSED;  
        }
    }
    
    /**
     * Resumes the timeout if it is paused.
     */
    resume(){
        if(this.isPaused){
            const time = this._duration - this._elapsedTime;
            this._start(time < 0 ? 0 : time);
        }
    }
  
}


/**
 * A class that helps compute statistics for the packets sent between a sender
 * and a receiver.
 */
export class StatsComputer{

    // Current interval count of packets
    _pktsSent = 0;
    _pktsReceived = 0;
    _pktsReceivedOk = 0;
    _pktsReSent = 0;
    _acksSent = 0;
    _acksReceived = 0;
    _acksReceivedOk = 0;
    _pktsConfirmed = 0;
    
    // Last interval count
    _lastPktsSent = 0;
    _lastPktsReceived = 0;
    _lastPktsReceivedOk = 0;
    _lastPktsReSent = 0;
    _lastAcksSent = 0;
    _lastAcksReceived = 0;
    _lastAcksReceivedOk = 0;
    _lastPktsConfirmed = 0;

    // Cumulative count of packets
    _totalPktsSent = 0;
    _totalPktsReceived = 0;
    _totalPktsReceivedOk = 0;
    _totalPktsReSent = 0;
    _totalAcksSent = 0;
    _totalAcksReceived = 0;
    _totalAcksReceivedOk = 0;
    _totalPktsConfirmed = 0;

    _interval = null; // A Timeout object for the update interval
    _updateTime = null; // The time in miliseconds for updating the statistics.
    _elapsedTime = 0; // The total time that the computations have run

    /**
     * Creates a new StatsComputer object. The generated statistics will be
     * updated every updateTime miliseconds.
     * @param {number} updateTime - The time in miliseconds for updating the
     * statistics.
     */
    constructor(updateTime){
        this._updateTime = updateTime;
    }

    /**
     * Starts the computer.
     */
    start(){
        if(this._interval === null){
            this._interval = new Timeout(this._updateTime, () => {
                this._update();
            }, true);
        }
    }

    /**
     * Returns the rate of the last interval for count.
     * @param {number} count - The count for which to get the rate.
     * @returns {number} - The rate in the last interval.
     * @private
     */
    _intervalRate(count){
        return count / this._updateTime * 1000;
    }

    /**
     * Returns the rate since the start for count.
     * @param {number} count - The count for which to get the rate.
     * @returns {number} - The rate since the start.
     * @private
     */
    _totalRate(count){
        return count / this._elapsedTime * 1000;
    }
    
    /** 
     * @member {number} - The time in miliseconds since the start till the last
     * interval. This is a multiple of the time given to the constructor.
     * @readonly
     */
    get elapsedTime () { return this._elapsedTime; }

    /**
     * @member {number} - The total packets sent by the sender.
     * @readonly
     */
    get totalPktsSent(){ return this._totalPktsSent; }

    /**
     * @member {number} - The total packets received by the receiver.
     * @readonly
     */
    get totalPktsReceived(){ return this._totalPktsReceived; }

    /** 
     * @member {number} - The total number of correct packets received by the
     * receiver. The definition of a correcly received packet depends on each
     * protocol.
     * @readonly
     */
    get totalPktsReceivedOk(){ return this._totalPktsReceivedOk; }

    /**
     * @member {number} - The total number of packets re-sent by the sender.
     * @readonly
     */
    get totalPktsReSent(){ return this._totalPktsReSent; }

    /**
     * @member {number} - The total number of acknowledgments sent by the
     * receiver.
     * @readonly
     */
    get totalAcksSent(){ return this._totalAcksSent; }

    /**
     * @member {number} - The total number of acknowledgments received by the
     * sender.
     * @readonly
     */
    get totalAcksReceived(){ return this._totalAcksReceived; }

    /**
     * @member {number} - The total number of acknowledgments correctly received
     * by the sender. The definition of a correcly received packet depends on
     * each protocol.
     * @readonly
     */
    get totalAcksReceivedOk(){ return this._totalAcksReceivedOk; }

    /**
     * @member {number} - The total number of packets confirmed to the sender.
     * @readonly
     */
    get totalPktsConfirmed(){ return this._totalPktsConfirmed; }

    /** 
     * @member {number} - The packets per second sent by the sender in the last
     * interval.
     * @readonly
     */
    get pktsSentRate() { return this._intervalRate(this._lastPktsSent); }

    /** 
     * @member {number} - The packets per second received by the receiver in the
     * last interval.
     * @readonly
     */
    get pktsReceivedRate(){ return this._intervalRate(this._lastPktsReceived); }

    /** 
     * @member {number} - The packets per second correctly received by the
     * receiver in the last interval.
     * @readonly
     */
    get pktsReceivedOkRate(){ return this._intervalRate(this._lastPktsReceivedOk); }

    /** 
     * @member {number} - The packets per second re-sent by the sender in the
     * last interval.
     * @readonly
     */
    get pktsReSentRate(){ return this._intervalRate(this._lastPktsReSent); }

    /** 
     * @member {number} - The acks per second sent by the receiver in the last
     * interval.
     * @readonly
     */
    get acksSentRate(){ return this._intervalRate(this._lastAcksSent); }
    /** 
     * @member {number} - The acks per second received by the sender in the last
     * interval.
     * @readonly
     */
    get acksReceivedRate(){ return this._intervalRate(this._lastAcksReceived); }

    /** 
     * @member {number} - The acks per second correctly received by the sender
     * in the last interval.
     * @readonly
     */
    get acksReceivedOkRate(){ return this._intervalRate(this._lastAcksReceivedOk); }

    /**
     * @member {number} - The packets per second confirmed to the sender in the
     * last interval.
     * @readonly
     */
    get pktsConfirmedRate(){ return this._intervalRate(this._lastPktsConfirmed); }

    /**
     * @member {number} - The packets per second sent by the sender since the
     * start.
     * @readonly
     */
    get totalPktsSentRate(){ return this._totalRate(this._totalPktsSent); }

    /**
     * @member {number} - The packets per second received by the receiver since
     * the start.
     * @readonly
     */
    get totalPktsReceivedRate(){ return this._totalRate(this._totalPktsReceived); }

    /**
     * @member {number} - The packets per second correctly received by the
     * receiver since the start.
     * @readonly
     */
    get totalPktsReceivedOkRate(){ return this._totalRate(this._totalPktsReceivedOk); }

    /**
     * @member {number} - The packets per second re-sent by the sender since the
     * start.
     * @readonly
     */
    get totalPktsReSentRate(){ return this._totalRate(this._totalPktsReSent); }

    /**
     * @member {number} - The acks per second sent by the receiver since the
     * start.
     * @readonly
     */
    get totalAcksSentRate(){ return this._totalRate(this._totalAcksSent); }

    /**
     * @member {number} - The acks per second received by the sender since the
     * start.
     * @readonly
     */
    get totalAcksReceivedRate(){ return this._totalRate(this._totalAcksReceived); }

    /**
     * @member {number} - The acks per second correctly received by the sender
     * since the start.
     * @readonly
     */
    get totalAcksReceivedOkRate(){ return this._totalRate(this._totalAcksReceivedOk); }

    /**
     * @member {number} - The packets per second confirmed to the sender since
     * the start.
     * @readonly
     */
    get totalPktsConfirmedRate(){ return this._totalRate(this._totalPktsConfirmed); }

    /**
     * Updates the counting variables and calls onUpdate().
     * @private
     */
    _update(){
        this._elapsedTime += this._updateTime;
        // Update cumulative variables
        this._totalPktsSent += this._pktsSent;
        this._totalPktsReceived += this._pktsReceived;
        this._totalPktsReceivedOk += this._pktsReceivedOk;
        this._totalPktsReSent += this._pktsReSent;
        this._totalAcksSent += this._acksSent;
        this._totalAcksReceived += this._acksReceived;
        this._totalAcksReceivedOk += this._acksReceivedOk;
        this._totalPktsConfirmed += this._pktsConfirmed;
        // Update last interval variables
        this._lastPktsSent = this._pktsSent;
        this._lastPktsReceived = this._pktsReceived;
        this._lastPktsReceivedOk = this._pktsReceivedOk;
        this._lastPktsReSent = this._pktsReSent;
        this._lastAcksSent = this._acksSent;
        this._lastAcksReceived = this._acksReceived;
        this._lastAcksReceivedOk = this._acksReceivedOk;
        this._lastPktsConfirmed = this._pktsConfirmed
        // Reset the current count of packets
        this._pktsSent = 0;
        this._pktsReceived = 0;
        this._pktsReceivedOk = 0;
        this._pktsReSent = 0;
        this._acksSent = 0;
        this._acksReceived = 0;
        this._acksReceivedOk = 0;
        this._pktsConfirmed = 0;
        this.onUpdate();
    }

    /**
     * A callback that is called every time an update of the statistics occurs.
     */
    onUpdate(){
        return;
    }

    /**
     * Counts and clasifies a packet sent by a sender or a receiver.
     * @param {Packet} packet - The packet to add to the statistics.
     */
    pktSent(packet){
        if(packet.isAck){
            this._acksSent++;
        }else{
            this._pktsSent++;
            if(packet.wasReSent)
                this._pktsReSent++;
        }
    }

    /**
     * Counts and clasifies a packet received by a sender or a receiver.
     * @param {Packet} packet - The packet to add to the statistics.
     * @param {boolean} isOK - true if the packet was correctly received by the
     * node, false otherwise.
     */
    pktReceived(packet, isOK){
        if(packet.isAck){
            this._acksReceived++;
            if(isOK)
                this._acksReceivedOk++;
        }else{
            this._pktsReceived++;
            if(isOK)
                this._pktsReceivedOk++;
        }
    }

    /**
     * Increases the count of confirmed packets.
     */
    pktConfirmed(){
        this._pktsConfirmed++;
    }

    /**
     * Pauses the computer.
     */
    pause(){
        this._interval.pause();
    }

    /**
     * Resumes the computer.
     */
    resume(){
        this._interval.resume();
    }

    /**
     * Stops the computer.
     */
    stop(){
        this._interval.stop();
    }
}
