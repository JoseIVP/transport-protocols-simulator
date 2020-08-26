/** @module "stopAndWait.js"  */

import Node from "./Node.js";
import Packet from "./Packet.js";


/** @property {number} - SWSender state for waiting to send packet with sequence number 0. */
export const WAIT_CALL_0 = 0;
/** @property {number} - SWSender state for waiting ACK 0 to arrive. */
export const WAIT_ACK_0 = 1;
/** @property {number} - SWSender state for waiting to send packet with sequence number 1. */
export const WAIT_CALL_1 = 2;
/** @property {number} - SWSender state for waiting ACK 1 to arrive. */
export const WAIT_ACK_1 = 3;

function isAck(packet, seqNum){
    return packet.isAck && packet.seqNum === seqNum;
}

/**
 * A class that represents a *stop-and-wait* sender.
 */
export class SWSender extends Node{

    /**
     * Creates a new SWSender instance.
     * @param {Object} options - The constructor options.
     * @param {SWReceiver} options.receiver - The *stop-and-wait* receiver.
     * @param {number} [options.timeoutTime=1500] - The time to wait for each acknowledgement from the receiver.
     * @param {Channel} optons.sender - The channel through wich to send the packets. 
     */
    constructor({
        receiver,
        timeoutTime = 1500,
        channel
    }){
        super();
        /** @member {Packet} - The current sent packet. */
        this.currentPacket = null;
        this.currentTimeoutID = null;
        /** @member {number} - The current state of the sender. */
        this.currentState = WAIT_CALL_0;
        /** @member {SWReceiver} - The receiver of the packets. */
        this.receiver = receiver;
        /** @member {number} - The time to wait for each acknowledgement. */
        this.timeoutTime = timeoutTime;
        /** @member {Channel} - The channel through wich the packets are sent. */
        this.channel = channel;
    }

    /**
     * Sends a packet if the current state is WAIT_CALL_0 or WAIT_CALL_1,
     * setting the corresponding timeout each time a packet is sent.
     * @override
     */
    send(){
        switch (this.currentState) {
            // No action for WAIT_ACK_0 and WAIT_ACK_1
            case WAIT_CALL_0:
                this._waitCall(0);
                break;
            case WAIT_CALL_1:
                this._waitCall(1);
        }
    }

    _waitCall(seqNum){
        const nextStates = [WAIT_ACK_0, WAIT_ACK_1];
        this.currentPacket = new Packet({
            seqNum: seqNum,
            sender: this,
            receiver: this.receiver,
        });
        this._sendAndTimeout();
        this.currentState = nextStates[seqNum];
    }

    _sendAndTimeout(){
        super.send(this.currentPacket, this.channel);
        this.currentTimeoutID = setTimeout(() => this._sendAndTimeout, this.timeoutTime);
    }

    /**
     * Receives a packet through a channel, taking action only if the current state
     * is WAIT_ACK_0 or WAIT_ACK_1 and if the packet is the corresponding ACK for
     * the packet sent before.
     * @override
     * @param {Packet} packet - The packet received. 
     * @param {Channel} channel - The channel through wich the packet arrives.
     */
    receive(packet, channel){
        super.receive(packet, channel);
        switch (this.currentState) {
            //No action for WAIT_CALL_1 and WAIT_CALL_0
            case WAIT_ACK_0:
                this._waitAck(packet, 0);
                break;
            case WAIT_ACK_1:
                this._waitAck(packet, 1);
        }
    }

    _waitAck(packet, seqNum){
        const nextStates = [WAIT_CALL_1, WAIT_CALL_0]
        if (!packet.isCorrupted && isAck(packet, seqNum)){
            clearTimeout(this.currentTimeoutID);
            this.currentPacket = null;
            this.currentTimeoutID = null;
            this.currentState = nextStates[seqNum];
        }
    }

}


/**
 * A class that represents a *stop-and-wait* receiver.
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
     * Override this function to intercept incorrectly received packets.
     * @param {Packet} packet - The received packet. 
     * @param {Channel} channel - The channel through wich the packet arrived.
     */
    onReceiveNotOk(packet, channel){
        return;
    }

    /**
     * Override this function to intercept correctly received packets.
     * @param {Packet} packet - The received packet. 
     * @param {Channel} channel - The channel through wich the packet arrived.
     */
    onReceiveOk(packet, channel){
        return;
    }

    /**
     * Receives a packet, sending and ACK for the previous received packet if the
     * current packet is corrupted or does not have the expected sequence number,
     * and sending an ACK for the received packet if it is the expected one. 
     * @param {Packet} packet - The received packet.
     * @param {Channel} channel - The channel through which the packet arrived.
     */
    receive(packet, channel){
        super.receive(packet, channel);
        if(packet.isCorrupted || packet.seqNum !== this.expectedSeqNum){
            this.onReceiveNotOk(packet, channel);
            const ack = new Packet({
                seqNum: (this.expectedSeqNum + 1) % 2,
                isAck: true,
                sender: this,
                receiver: packet.sender
            })
            this.send(ack, channel);
        } else {
            this.onReceiveOk(packet, channel);
            const ack = new Packet({
                seqNum: this.expectedSeqNum,
                isAck: true,
                sender: this,
                receiver: packet.sender 
            });
            this.send(ack, channel);
            this.expectedSeqNum = (this.expectedSeqNum + 1) % 2;
        }
    }

}
