/** @module stopAndWait  */

import Node from "./Node.js";
import Packet from "./Packet.js";
import { Timeout } from "./utils.js";


function isAck(packet, seqNum){
    return packet.isAck && packet.ackNum === seqNum;
}

/**
 * A class that represents a *stop-and-wait* sender.
 * @extends Node
 */
export class SWSender extends Node{

    /**
     * Creates a new SWSender instance.
     * @param {Object} options - The constructor options.
     * @param {SWReceiver} options.receiver - The *stop-and-wait* receiver.
     * @param {number} [options.timeout=2100] - The time to wait for each acknowledgment from the receiver.
     * @param {Channel} options.channel - The channel through which to send the packets. 
     */
    constructor({
        receiver,
        timeout = 2100,
        channel
    }){
        super();
        /**
         * @member {Timeout} - The current timeout object.
         * @private
         */
        this._currentTimeout = null;
        /** @member {SWReceiver} - The receiver of the packets. */
        this.receiver = receiver;
        /** @member {number} - The time to wait for each acknowledgment. */
        this.timeout = timeout;
        /** @member {Channel} - The channel through which the packets are sent. */
        this.channel = channel;
        /**
         * @member {number} - The current sequence number to send or to wait for
         * acknowledgment. It can only be 0 or 1, starting with 0.
         */
        this.currentSeqNum = 0;
        /**
         * @member {boolean} - true if the sender is waiting for an acknowledgment. When
         * the instance is created this property is false.
         */
        this.isWaitingAck = false;
    }

    /**
     * If the sender is not waiting for an acknowledgment sends a packet,
     * returning true and setting the corresponding timeout each time a
     * packet is sent. If the sender is waiting for an acknowledgment,
     * then it can not send a packet and the method returns false.
     * @override
     * @returns {boolean} - true if sending a packet, false otherwise.
     */
    send(){
        if (this.isWaitingAck)
            return false;
        super.send(new Packet({
            seqNum: this.currentSeqNum,
            sender: this,
            receiver: this.receiver,
        }), this.channel);
        this._setTimeout();
        this.isWaitingAck = true;
        this.onStateChange();
        return true;
    }

    _setTimeout(){
        this._currentTimeout = new Timeout(this.timeout, () => {
            super.send(new Packet({
                seqNum: this.currentSeqNum,
                sender: this,
                receiver: this.receiver,
                wasReSent: true,
            }), this.channel);
            this._setTimeout();
        });
        this.onTimeoutSet(this.currentSeqNum);
    }

    /**
     * Receives a packet through a channel, taking action only if waiting for
     * an acknowledgment and if the packet is the corresponding acknowledgment for
     * the packet sent before. If action is taken, then the third argument for
     * the onReceive() callback will be true, else it will be false.
     * @override
     * @param {Packet} packet - The packet received. 
     * @param {Channel} channel - The channel through which the packet arrives.
     */
    receive(packet, channel){
        if (this.isWaitingAck && !packet.isCorrupted && isAck(packet, this.currentSeqNum)){
            this.onReceive(packet, channel, true);
            this._currentTimeout.stop();
            this._currentTimeout = null;
            this.onTimeoutUnset(packet.ackNum);
            // Change the state to enable sending the next sequence number
            this.isWaitingAck = false;
            this.currentSeqNum = (this.currentSeqNum + 1) % 2;
            this.onStateChange();
        }else{
            this.onReceive(packet, channel, false);
        }
    }

    /**
     * Stops the current timeout. 
     */
    stop(){
        this._currentTimeout.stop();
        this._currentTimeout = null;
    }

    /**
     * Pauses the current timeout if any.
     */
    pause(){
        this._currentTimeout?.pause();
    }

    /**
     * Resumes the current timeout if any.
     */
    resume(){
        this._currentTimeout?.resume();
    }

}


/**
 * A class that represents a *stop-and-wait* receiver.
 * @extends Node
 */
export class SWReceiver extends Node{

    /**
     * Creates a new SWReceiver instance.
     */
    constructor(){
        super();
        /** @member {number} - The next packet sequence number expected by the receiver. */
        this.expectedSeqNum = 0;
    }

    /**
     * Receives a packet, sending and ACK for the previous received packet if the
     * current packet is corrupted or does not have the expected sequence number,
     * and sending an ACK for the received packet if it is the expected one.
     * If the packet is the expected one, then the thid argument for the onReceive()
     * callback will be true, else it will be false.
     * @param {Packet} packet - The received packet.
     * @param {Channel} channel - The channel through which the packet arrived.
     */
    receive(packet, channel){
        const ack = new Packet({
            isAck: true,
            sender: this,
            receiver: packet.sender 
        })
        if(packet.isCorrupted || packet.seqNum !== this.expectedSeqNum){
            this.onReceive(packet, channel, false);
            ack.ackNum = (this.expectedSeqNum + 1) % 2;
            this.send(ack, channel);
        } else {
            this.onReceive(packet, channel, true);
            ack.ackNum = this.expectedSeqNum;
            this.send(ack, channel);
            this.expectedSeqNum = (this.expectedSeqNum + 1) % 2;
            this.onStateChange();
        }
    }

}
