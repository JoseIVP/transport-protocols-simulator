/** @module stopAndWait  */

import {
    AbstractSequentialReceiver,
    AbstractARQSender
} from "./abstractNodes.js";
import Packet from "./Packet.js";


/**
 * A class that represents a *stop-and-wait* sender.
 * @extends AbstractARQSender
 */
export class SWSender extends AbstractARQSender{

    /**
     * @member {number} - The current sequence number to send and wait for
     * acknowledgments.
     * @private
     */
    _currentSeqNum = 0;
    /**
     * @member {boolean} - true if the node is waiting for an acknowledgment,
     * false otherwise.
     * @private
     */
    _isWaitingAck = false;

    /**
     * Creates a new SWSender instance.
     * @param {Object} options - The constructor options.
     * @param {SWReceiver} options.receiver - The *stop-and-wait* receiver.
     * @param {number} options.timeout - The time to wait for each
     * acknowledgment from the receiver.
     * @param {Channel} options.channel - The channel through which to send the
     * packets. 
     */
    constructor({
        receiver,
        timeout,
        channel
    }){
        super({
            receiver,
            timeout,
            channel,
            seqNumLimit: 2
        });
    }

    /**
     * @member {number} - The current sequence number to send and wait for
     * acknowledgments.
     * @readonly
     */
    get currentSeqNum(){ return this._currentSeqNum; }

    /**
     * @member {boolean} - true if the node is waiting for an acknowledgment,
     * false otherwise.
     * @readonly
     */
    get isWaitingAck(){ return this._isWaitingAck; }

    /**
     * Tests whether a received packet is correct or not. A packet is correctly
     * received if the node is waitiing for an acknowldgment, the packet is not
     * corrupted, is an acknowlegment, and the acknowledged sequence is the
     * expected one.
     * @param {Packet} packet - The packet to test.
     * @returns {boolean} - true if the packet is correct, false otherwise.
     * @protected
     * @override 
     */
    _checkReceivedPkt(packet){
        return this._isWaitingAck && !packet.isCorrupted && 
            packet.isAck && packet.ackNum === this._currentSeqNum;
    }

    /**
     * Processes a correctly received packet.
     * @param {Packet} packet - The packet to process.
     * @protected
     * @override
     */
    _processExpectedPkt(packet){
        this.onPktConfirmed(packet.ackNum);
        this._unsetTimeout(packet.ackNum);
        this._isWaitingAck = false;
        this._currentSeqNum = this._nextSequence(packet.ackNum);
    }

    /**
     * Resends the packet corresponding to seqNum and resets the timeout.
     * @param {number} seqNum - The sequence number for which the timeout
     * passed.
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

    /**
     * Tests whether the node can send the next packet or not.
     * @returns {boolean} - true if the node is not waiting for an ack, false
     * otherwise.
     * @protected
     * @override
     */
    _canSend(){
        return !this._isWaitingAck;
    }

    /**
     * Sends a packet for the current sequence number, and starts a timeout.
     * @protected
     * @override
     */
    _processSending(){
        this._sendPkt(new Packet({
            sender: this,
            receiver: this._receiver,
            seqNum: this._currentSeqNum
        }));
        this._setTimeout(this._currentSeqNum);
        this._isWaitingAck = true;
    }
}


/**
 * A class that represents a *stop-and-wait* receiver.
 * @extends AbstractSequentialReceiver
 */
export class SWReceiver extends AbstractSequentialReceiver{

    /**
     * Creates a new SWReceiver instance.
     * @param {Object} options - The constructor options.
     * @param {Channel} options.channel - The channel through which to send the
     * acknowledgments.
     */
    constructor({channel}){
        super({
            channel,
            seqNumLimit: 2
        });
    }
}
