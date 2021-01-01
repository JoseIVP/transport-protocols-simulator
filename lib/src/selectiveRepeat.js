/** @module selectiveRepeat  */

import {
    AbstractARQReceiver,
    AbstractWindowedSender
} from "./abstractNodes.js";
import Packet from "./Packet.js";


/**
 * A class that implements the sender of *selective-repeat*.
 * @extends AbstractWindowedSender
 */
export class SRSender extends AbstractWindowedSender{

    /**
     * Creates a new SRSender instance.
     * @param {Object} options - The constructor options.
     * @param {SRReceiver} options.receiver - The *selective-repeat* receiver.
     * @param {number} options.timeout - The time to wait for an acknowledgment
     * from the receiver.
     * @param {Channel} options.channel - The channel through which to send the
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
            windowSize
        });
    }

    /**
     * Tests whether a received packet is correct or not. A packet is correct if
     * it's an acknowledgment, it's not corrupted and, the acknowledged sequence
     * was sent and has not been confirmed already, or the acknowledgment is
     * cumulative and the acknowledged sequence is in the current window of sent
     * packets.
     * @param {Packet} packet - The packet to test.
     * @returns {boolean} - true if the packet is correct, false otherwise.
     * @protected
     * @override
     */
    _checkReceivedPkt(packet){
        // A sequence that was sent and has not been confirmed already has a
        // timeout.
        const {isCorrupted, isAck, isCAck, ackNum} = packet;
        return !isCorrupted && isAck && (isCAck && this._isInExpectedRange(ackNum)
            || this._isTimeoutSet(ackNum));
    }

    /**
     * Processes a correctly received packet, confirming the acknowledged
     * sequence and all previous unacknowledged sent sequences if the packet is
     * a cumulative ack. Moves the window if the base sequence of the window is
     * confirmed.
     * @param {Packet} packet - The packet to process.
     * @protected
     * @override
     */
    _processExpectedPkt(packet){
        const {ackNum, isCAck} = packet;
        const {base, nextSeqNum} = this;
        let seqNum = isCAck ? base : ackNum;
        const nextToAckNum = this._nextSequence(ackNum)
        for(; seqNum!=nextToAckNum; seqNum=this._nextSequence(seqNum)){
            if(this._isTimeoutSet(seqNum)){
                this._unsetTimeout(seqNum);
                this.onPktConfirmed(seqNum);
            }
        }
        if(ackNum == base || isCAck){
            // Move the window
            let newBase = base;
            while(newBase != nextSeqNum && !this._isTimeoutSet(newBase))
                newBase = this._nextSequence(newBase);
            this._setBase(newBase);
        }
    }

    /**
     * Sends a packet and sets its timeout.
     * @protected
     * @override
     */
    _processSending(){
        const {nextSeqNum} = this;
        this._sendPkt(new Packet({
            sender: this,
            receiver: this._receiver,
            seqNum: nextSeqNum
        }));
        this._setTimeout(nextSeqNum);
        this._nextSeqNum = this._nextSequence(nextSeqNum);
    }

    /**
     * Resends the packet corresponding to seqNum and resets its timeout.
     * @param {number} seqNum - The sequence number for which the timeout passed.
     * @protected
     * @override
     */
    _onTimeout(seqNum){
        this._sendPkt(new Packet({
            sender: this,
            receiver: this._receiver,
            seqNum,
            wasReSent: true
        }));
        this._setTimeout(seqNum);
    }
}


/**
 * A class that implements the receiver of *selective-repeat*.
 * @extends AbstractARQReceiver
 */
export class SRReceiver extends AbstractARQReceiver{

    /**
     * @member {number} - The base sequence number of the window.
     * @private
     */
    _base = 0;
    /**
     * @member {number} - The size of the sliding window.
     * @private
     */
    _windowSize;
    /**
     * @member {boolean} - If it's true, then the instance will use cumulative
     * acks.
     * @private
     */
    _useCAck;
    /**
     * @member {Array} - An array of booleans were _buffer[seqNum] is true or
     * false if seqNum was received or not respectively.
     * @private
     */
    _buffer;

    /**
     * Creates a new SRReceiver instance.
     * @param {Object} options - The constructor options.
     * @param {Channel} options.channel - The channel through which to send the
     * acknowledgments.
     * @param {number} options.windowSize - The size of the sliding window.
     * @param {boolean} [options.useCAck=false] - true if the instance should send
     * cumulative acknowledgments.
     */
    constructor({
        channel,
        windowSize,
        useCAck = false
    }){
        const seqNumLimit = windowSize * 2;
        super({
            channel,
            seqNumLimit
        });
        this._windowSize = windowSize
        this._useCAck = useCAck;
        this._buffer = new Array(seqNumLimit);
        for(let i=0; i<seqNumLimit; i++)
            this._buffer[i] = false;
    }

    /**
     * @member {number} - The base sequence number of the sliding window.
     * @readonly
     */
    get base(){ return this._base; }

    /**
     * A callback that is called every time the sliding window is moved.
     * @param {number} spaces - The number of spaces that the window was moved.
     */
    onWindowMoved(spaces){
        return;
    }

    /**
     * Sets the base sequence of the window, moving it and therefore calling
     * onWindowMoved().
     * @param {number} newBase - The new base sequence of the window.
     * @private
     */
    _setBase(newBase){
        let spaces = newBase - this._base;
        if(newBase < this._base)
            spaces += this._windowSize * 2
        this._base = newBase;
        this.onWindowMoved(spaces);
    }

    /**
     * Tests whether seqNum is in the window or not.
     * @param {number} seqNum - The sequence to test.
     * @returns {boolean} - true if seqNum is in the window, false otherwise. 
     * @private
     */
    _isInWindow(seqNum){
        const {base} = this;
        const windowLimit = (base + this._windowSize) % (this._windowSize * 2);
        if(base < windowLimit)
            return base <= seqNum && seqNum < windowLimit;
        else if(base > windowLimit)
            return !(windowLimit <= seqNum && seqNum < base);
        return false;
    }

    /**
     * Tests whether a received packet is correct or not. A packet is correct if
     * its sequence is in the window and was not already received.
     * @param {Packet} packet - The packet to test.
     * @returns {boolean} - true if the packet is correct, false otherwise.
     * @protected
     * @override
     */
    _checkReceivedPkt(packet){
        const {isCorrupted, seqNum} = packet;
        return !isCorrupted && !this._buffer[seqNum] &&
            this._isInWindow(seqNum);
    }

    /**
     * Processes a correctly received packet, moving the window if its sequence
     * is the base sequence of the window, and sending the corresponding
     * acknowledgment.
     * @param {Packet} packet - The packet to process.
     * @protected
     * @override
     */
    _processExpectedPkt(packet){
        const {seqNum} = packet;
        let {base} = this;
        this._buffer[seqNum] = true;
        let isCAck = false;
        let ackNum = seqNum;
        if(seqNum == base){
            // Move the window
            while(this._buffer[base]){
                this._buffer[base] = false;
                base = this._nextSequence(base);
            }
            this._setBase(base);
            if(this._useCAck){
                isCAck = true;
                ackNum = this._previousSequence(base);
            }
        }
        this._sendPkt(new Packet({
            sender: this,
            receiver: packet.sender,
            isAck: true,
            isCAck,
            ackNum
        }));
    }

    /**
     * Processes an incorrectly received packet, sending an acknowledgment when
     * it corresponds.
     * @param {Packet} packet - The packet to process.
     * @protected
     * @override
     */
    _processUnexpectedPkt(packet){
        // Process packets that are corrupted, or are already in the buffer or
        // are not in the window
        const options = {
            sender: this,
            receiver: packet.sender,
            isAck: true
        };
        const isInBuffer = this._buffer[packet.seqNum];
        if(this._useCAck){
            if(isInBuffer){
                // The packet is a duplicate
                options.ackNum = packet.seqNum;
            }else{
                // The packet is not in the buffer and, it is corrupted or is
                // not in the window
                options.isCAck = true;
                options.ackNum = this._previousSequence(this._base);
            }
            this._sendPkt(new Packet(options));
        }else{
            if(isInBuffer || !this._isInWindow(packet.seqNum)){
                // The packet is a duplicate or is older than the window
                options.ackNum = packet.seqNum;
                this._sendPkt(new Packet(options));
            }
            // If the packet is in the window, but not in the buffer and is
            // corrupted, then we do nothing
        }
    }
} 