/** @module abstractNodes  */

import Packet from "./Packet.js";
import { Timeout } from "./utils.js";

/**
 * An abstract class that implements the basic behaviour for ARQ protocols.
 */
export class AbstractARQNode{

    /**
     * @member {Channel} - The channel trough which to send packets.
     * @private
     */
    _channel;
    /**
     * @member {number} - One more than the maximum sequence number to use. This
     * should be double the size of the sliding window for protocols that use
     * one.
     * @private
     */
    _seqNumLimit;


    /**
     * Initializes a new AbstractARQNode. Only subclasses should use this
     * constructor, through super().
     * @param {Object} options - The options for the constructor.
     * @param {Channel} options.channel - The channel through which to send
     * packets.
     * @param {number} options.seqNumLimit - One more than the maximum sequence
     * number to use (or double the size of the sliding window).
     */
    constructor({channel, seqNumLimit}){
        if(this.constructor === AbstractARQNode)
            throw new Error("AbstractARQNode is an abtract class");
        this._channel = channel;
        this._seqNumLimit = seqNumLimit;
    }
    
    /**
     * An abstract method that should return a boolean indicating if the
     * received packet is correct or not.
     * @param {Packet} packet - The received packet.
     * @returns {boolean} - true if the packet is correct according to the
     * protocol of the instance, false otherwise.
     * @protected
     * @abstract
     */
    _checkReceivedPkt(packet){
        throw new Error("Abstract method");
    }
    
    /**
     * An abstract method that should be implemented to process packets that
     * were correctly received.
     * @param {Packet} packet - The received packet to process.
     * @protected
     * @abstract
     */
    _processExpectedPkt(packet){
        throw new Error("Abstract method");
    }
    
    /**
     * An abstract method that should be implemented to process packets that
     * were not correctly received.
     * @param {Packet} packet - The received packet to process.
     * @protected
     * @abstract
     */
    _processUnexpectedPkt(packet){
        throw new Error("Abstract method");
    }

    /**
     * A callback that is executed each time a packet is received through
     * receive().
     * @param {Packet} packet - The received packet.
     * @param {boolean} isOk - true if the packet was correct according to the
     * class (protocol) of the instance.
     */
    onReceive(packet, isOk){
        return;
    }
    
    /**
     * Receives a packet.
     * @param {Packet} packet - The packet to be received.
     */
    receive(packet){
        const isOk = this._checkReceivedPkt(packet);
        this.onReceive(packet, isOk);
        if(isOk)
            this._processExpectedPkt(packet);
        else
            this._processUnexpectedPkt(packet);
    }

    /**
     * A callback that is executed every time a packet is sent.
     * @param {Packet} packet - The sent packet.
     */
    onSend(packet){
        return;
    }

    /**
     * Sends a packet through the channel and calls onSend().
     * @param {Packet} packet - The packet to send.
     * @protected
     */
    _sendPkt(packet){
        this._channel.send(packet);
        this.onSend(packet);
    }

    /**
     * An abstract method that should implement the logic for sending a packet.
     * @protected
     * @abstract
     */
    _processSending(){
        throw new Error("Abstract method"); 
    }

    /**
     * An abstract method that should be implemented to decide whether the node
     * can send a packet (true) or not (false) when send() is called, depending
     * on the protocol.
     * @returns {boolean} - true if the instance can send a packet, false
     * otherwise.
     * @protected
     * @abstract
     */
    _canSend(){
        throw new Error("Abstract method");
    }

    /**
     * If the instance can send a packet, sends it and returns true, otherwise
     * it returns false. This depends on the protocol.
     * @returns {boolean} - true if the instance could send a packet, false if
     * not.
     */
    send(){
        if(this._canSend()){
            this._processSending();
            return true;
        }
        return false;
    }

    /**
     * Returns the next sequence to seqNum. This depends on the option
     * seqNumLimit given to the constructor. For example, if seqNumLimit was 4,
     * then the available sequences are 0, 1, 2 and 3, so the sequence next to 0
     * is 1, next to 1 is 2, next to 2 is 3 and next to 3 is 0.
     * @param {number} seqNum - The sequence number to get the next of.
     * @protected
     */
    _nextSequence(seqNum){
        return (seqNum + 1) % this._seqNumLimit;
    }

    /**
     * Returns the previous sequence to seqNum, similarly to _nextSequence().
     * @param {number} seqNum - The sequence number to get the previous of.
     * @protected
     */
    _previousSequence(seqNum){
        return (seqNum + this._seqNumLimit - 1) % this._seqNumLimit;
    }
}


/**
 * An abstract class that implements the basic functionality for ARQ senders.
 * @extends AbstractARQNode
 */
export class AbstractARQSender extends AbstractARQNode{

    /**
     * @member {Map} - A Map that maps sequence numbers (number) to timeouts
     * (Timeout).
     * @private
     */
    _timeouts = new Map();
    /**
     * @member {number} - The time in miliseconds to wait for acknowledgments.
     * @private
     */
    _timeout;
    /**
     * @member {AbstractARQReceiver} - The receiver node to send packets to.
     * @protected
     */
    _receiver;

    /**
     * Creates a new AbstractARQSender instance. Only subclasses should use this
     * constructor, through super().
     * @param {Object} options - The options for the constructor.
     * @param {AbstractARQReceiver} options.receiver - The receiver node to send
     * packets to.
     * @param {number} options.timeout - The time in miliseconds to wait for
     * acknowledgments.
     * @param {Channel} options.channel - The channel through which to send
     * packets.
     * @param {number} options.seqNumLimit- One more than the maximum sequence
     * number to use (or double the size of the sliding window).
     */
    constructor({
        receiver,
        timeout,
        channel,
        seqNumLimit
    }){
        super({channel, seqNumLimit});
        this._timeout = timeout;
        this._receiver = receiver;
    }

    /**
     * An abstract method that is executed every time a timeout occurs.
     * Subclasses should implement in this method their timeout logic.
     * @param {number} seqNum - The sequence number for which the timeout
     * passed.
     * @protected
     * @abstract
     */
    _onTimeout(seqNum){
        throw new Error("Abstract method");
    }

    /**
     * A callback that is executed each time a timeout is set for a sequence
     * number.
     * @param {number} seqNum - The sequence number for which a timeout was set.
     */
    onTimeoutSet(seqNum){
        return;
    }

    /**
     * Sets a timeout for a sequence number. If a timeout was already set, then
     * it throws an error. A timeout is unset when _unsetTimeout() is used or
     * the timeout has passed. 
     * @param {number} seqNum - The sequence number for which to set a timeout.
     * @protected
     */
    _setTimeout(seqNum){
        if(this._timeouts.has(seqNum))
            throw new Error(`A timeout for sequence number ${seqNum} was already set.`);
        this._timeouts.set(seqNum, new Timeout(this._timeout, ()=>{
            this._timeouts.delete(seqNum);
            this._onTimeout(seqNum);
        }));
        this.onTimeoutSet(seqNum);
    }

    /**
     * Returns true if a timeout is set for seqNum, and false otherwise.
     * @param {number} seqNum - The sequence number to test.
     * @protected
     */
    _isTimeoutSet(seqNum){
        return this._timeouts.has(seqNum);
    }

    /**
     * A callback that is called every time a timeout is unset for a sequence
     * number.
     * @param {number} seqNum - The sequence number for which the timeout was
     * unset. 
     */
    onTimeoutUnset(seqNum){
        return;
    }

    /**
     * Unsets the timeout for a sequence number.
     * @param {number} seqNum - The sequence number for which to unset the
     * timeout.
     * @protected
     */
    _unsetTimeout(seqNum){
        const timeout = this._timeouts.get(seqNum);
        if(timeout !== undefined){
            timeout.stop();
            this._timeouts.delete(seqNum);
            this.onTimeoutUnset(seqNum);
        }
    }

    /**
     * A callback that is called every time a packet and its sequence number is
     * confirmed.
     * @param {number} seqNum - The confirmed sequence number. 
     */
    onPktConfirmed(seqNum){
        return;
    }

    /**
     * Does nothing, senders ignore received packets that are wrong.
     * @protected
     * @override
     */
    _processUnexpectedPkt(packet){
        return;
    }

    /**
     * Pauses all the timeouts.
     */
    pause(){
        this._timeouts.forEach(timeout => timeout.pause());
    }

    /**
     * Resumes all the timeouts.
     */
    resume(){
        this._timeouts.forEach(timeout => timeout.resume());
    }

    /**
     * Stops all the timeouts.
     */
    stop(){
        this._timeouts.forEach(timeout => timeout.stop());
    }
}

/**
 * An abstract class that implements the common logic between senders that use a
 * sliding window.
 * @extends AbstractARQSender
 */
export class AbstractWindowedSender extends AbstractARQSender{
    
    /**
     * @member {number} - The base sequence number of the window.
     * @protected
     */
    _base = 0;
    /**
     * @member {number} - The next sequence number available to send.
     * @protected
     */
    _nextSeqNum = 0;
    /**
     * @member {number} - The size of the sliding window.
     * @protected
     */
    _windowSize;


    /**
     * Creates a new AbstractWindowedSender instance. Only subclasses should use
     * this constructor, through super().
     * @param {Object} options - The options for the constructor.
     * @param {AbstractARQReceiver} options.receiver - The receiver node to send
     * packets to.
     * @param {number} options.timeout - The time in miliseconds to wait for
     * acknowledgments.
     * @param {Channel} options.channel - The channel through which to send
     * packets.
     * @param {number} options.windowSize - The size of the sliding window.
     */
    constructor({
        receiver,
        timeout,
        channel,
        windowSize
    }){
        super({
            receiver,
            timeout,
            channel,
            seqNumLimit: windowSize * 2
        });
        this._windowSize = windowSize;
    }

    /**
     * @member {number} - The base sequence number of the sliding window.
     * @readonly
     */
    get base(){ return this._base; }

    /**
     * @member {number} - The next sequence number available to send.
     * @readonly
     */
    get nextSeqNum(){ return this._nextSeqNum; }

    /**
     * A callback that is called every time the sliding window is moved.
     * @param {number} spaces - The number of spaces that the window was moved.
     */
    onWindowMoved(spaces){
        return;
    }

    /**
     * Sets the base sequence number for the sliding window, causing it to move,
     * and therefore executing onWindowMoved().
     * @param {number} newBase - The new base sequence number for the window.
     * @protected
     */
    _setBase(newBase){
        let spaces = newBase - this._base;
        if(newBase < this._base)
            spaces += this._windowSize * 2
        this._base = newBase;
        this.onWindowMoved(spaces);
    }

    /**
     * Tests if a sequence number is in the given cyclical range, were lower
     * should go before seqNum and upper should go after seqNum.
     * @param {number} seqNum - The sequence number to test.
     * @param {number} lower - The sequence that should go before seqNum.
     * @param {number} upper - The sequence that shoulg go after seqNum.
     * @returns {booelan} - true if seqNum is between lower and upper, false
     * otherwise.
     * @protected
     */
    _isInRange(seqNum, lower, upper){
        if(lower < upper)
            return lower <= seqNum && seqNum < upper;
        else if(lower > upper)
            return !(upper <= seqNum && seqNum < lower);
        return false;
    }

    /**
     * Tests if a sequence number is in the expected range (between base and
     * nextSeqNum).
     * @param {number} seqNum - The sequence number to test.
     * @returns {boolean} - true if seqNum is between base and nextSeqNum, false
     * otherwise.
     * @protected
     */
    _isInExpectedRange(seqNum){
        return this._isInRange(seqNum, this.base, this.nextSeqNum);
    }

    /**
     * Tests whether there is room in the window to send the next packet.
     * @returns {boolean} - true if the next packet can be sent, false
     * otherwise.
     * @protected
     * @override
     */
    _canSend(){
        const {nextSeqNum, base} = this;
        const windowLimit = (base + this._windowSize) % (this._windowSize * 2);
        return this._isInRange(nextSeqNum, base, windowLimit); 
    }
}


/**
 * An abstract class that implements the send() logic (return false and do
 * nothing) for receiver classes.
 * @extends AbstractARQNode
 */
export class AbstractARQReceiver extends AbstractARQNode{

    /**
     * Does nothing
     * @protected
     * @override
     */
    _processSending(){
        return;
    }

    /**
     * Returns false, as send() cannot be used to send packets in a receiver.
     * @protected
     * @override
     */
    _canSend(){
        return false;
    }
}

/**
 * An abstract class that implements the logic of nodes that receive sequence
 * numbers in an ordered manner.
 * @extends AbstractARQReceiver
 */
export class AbstractSequentialReceiver extends AbstractARQReceiver{
    
    /**
     * @member {number} - The next sequence number that the node expects to
     * receive.
     * @private
     */
    _expectedSeqNum = 0;
    
    /**
     * @member {number} - The next sequence number that the node expects to
     * receive.
     * @readonly
     */
    get expectedSeqNum(){ return this._expectedSeqNum; }

    /**
     * Tests whether a packet is correct or not. A packet is correct if it's not
     * corrupted and the sequence number is the expected one.
     * @param {Packet} packet - The received packet.
     * @returns {boolean} - true if packet is correct, false otherwise.
     * @protected
     * @override
     */
    _checkReceivedPkt(packet){
        return !packet.isCorrupted && packet.seqNum === this._expectedSeqNum;
    }

    /**
     * Processes a correctly received packet, sending the corresponding
     * acknowledgment to the sender.
     * @param {Packet} packet - The packet to process.
     * @protected
     * @override
     */
    _processExpectedPkt(packet){
        const {expectedSeqNum} = this;
        this._sendPkt(new Packet({
            sender: this,
            receiver: packet.sender,
            isAck: true,
            ackNum: expectedSeqNum
        }));
        this._expectedSeqNum = this._nextSequence(expectedSeqNum);
    }

    /**
     * Processes an incorrectly received packet, sending an acknowledgment for
     * the last correctly received packet.
     * @param {Packet} packet - The packet to process.
     */
    _processUnexpectedPkt(packet){
        this._sendPkt(new Packet({
            sender: this,
            receiver: packet.sender,
            isAck: true,
            ackNum: this._previousSequence(this._expectedSeqNum)
        }));
    }
}