/** @module goBackN */

import {
    AbstractSequentialReceiver,
    AbstractWindowedSender
} from "./abstractNodes.js";
import Packet from "./Packet.js";


/**
 * A class that represents a *go-back-n* sender.
 * @extends AbstractWindowedSender
 */
export class GBNSender extends AbstractWindowedSender{

    /**
     * Creates a new GBNSender instance.
     * @param {Object} options - The constructor options.
     * @param {GBNReceiver} options.receiver - The *go-back-n* receiver.
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
     * it's an acknowledgment, it's not corrupted and the acknowledged sequence
     * number corresponds to one of the sequences in the set of sent packets
     * from the current window.
     * @param {Packet} packet - The packet to test.
     * @returns {boolean} - true if packet is correct, false otherwise.
     * @protected
     * @override
     */
    _checkReceivedPkt(packet){
        const {isCorrupted, isAck, ackNum} = packet;
        return !isCorrupted && isAck && this._isInExpectedRange(ackNum);
    }

    /**
     * Processes a correctly received packet, confirming the acknowledged
     * sequence and all previous ones. It moves the window and stops the timeout
     * or, if there are still unacknowledged sequences in the window, resets it.
     * @param {Packet} packet - The packet to process.
     * @protected
     * @override
     */
    _processExpectedPkt(packet){
        const {base, nextSeqNum} = this;
        const newBase = this._nextSequence(packet.ackNum);
        for(let i=base; i!=newBase; i=this._nextSequence(i))
            this.onPktConfirmed(i);
        this._unsetTimeout(base);
        this._setBase(newBase);
        if(newBase != nextSeqNum)
            this._setTimeout(newBase);
    }

    /**
     * Resends the previously sent packets from the current window, and restarts
     * the timeout.
     * @param {number} seqNum - The sequence number for which the timeout
     * passed.
     * @protected
     * @override
     */
    _onTimeout(seqNum){
        const {nextSeqNum} = this;
        for(let i=seqNum; i!=nextSeqNum; i=this._nextSequence(i))
            this._sendPkt(new Packet({
                seqNum: i,
                sender: this,
                receiver: this._receiver,
                wasReSent: true
            }));
        this._setTimeout(seqNum);
    }

    /**
     * Sends a packet and starts a timeout if it is the first of the window.
     * @protected
     * @override
     */
    _processSending(){
        const {base, nextSeqNum} = this;
        this._sendPkt(new Packet({
            sender: this,
            receiver: this._receiver,
            seqNum: nextSeqNum
        }));
        if(base == nextSeqNum)
            this._setTimeout(nextSeqNum);
        this._nextSeqNum = this._nextSequence(nextSeqNum);
    }
}


/**
 * A class that represents a *go-back-n* receiver.
 * @extends AbstractSequentialReceiver
 */
export class GBNReceiver extends AbstractSequentialReceiver{

    /**
     * Creates a new GBNReceiver instance.
     * @param {Object} options - The constructor options.
     * @param {Channel} options.channel - The channel through which to send the
     * acknowledgments.
     * @param {number} options.windowSize - The size of the window used by the
     * sender.
     */
    constructor({
        channel,
        windowSize
    }){
        super({
            channel,
            seqNumLimit: windowSize * 2
        });
    }
}
