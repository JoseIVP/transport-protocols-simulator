/** @module "stopAndWait.js"  */

import Node from "./Node.js";
import Packet from "./Packet.js";


function isAck(packet, seqNum){
    return packet.isAck && packet.ackNum === seqNum;
}

/**
 * A class that represents a *stop-and-wait* sender.
 */
export class SWSender extends Node{

    /**
     * Creates a new SWSender instance.
     * @param {Object} options - The constructor options.
     * @param {SWReceiver} options.receiver - The *stop-and-wait* receiver.
     * @param {number} [options.timeoutTime=1500] - The time to wait for each acknowledgment from the receiver.
     * @param {Channel} options.sender - The channel through wich to send the packets. 
     */
    constructor({
        receiver,
        timeoutTime = 1500,
        channel
    }){
        super();
        /**
         * @member {Packet} - The current sent packet. It should change every time a
         * new packet is sent, i.e. when send() sends a packet or a timeout is reached,
         * causing a new packet to be sent. Also, should be null when no acknowledgment
         * is expected and send() has not been called.
         */
        this.currentPacket = null;
        this.currentTimeoutID = null;
        /** @member {SWReceiver} - The receiver of the packets. */
        this.receiver = receiver;
        /** @member {number} - The time to wait for each acknowledgment. */
        this.timeoutTime = timeoutTime;
        /** @member {Channel} - The channel through wich the packets are sent. */
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
     * setting the corresponding timeout each time a packet is sent.
     * @override
     */
    send(){
        if (!this.isWaitingAck){
            this._sendAndTimeout();
            this.isWaitingAck = true; 
        }
    }

    _sendAndTimeout(){
        // Send a new packet and set the timer
        this.currentPacket = new Packet({
            seqNum: this.currentSeqNum,
            sender: this,
            receiver: this.receiver,
        });
        super.send(this.currentPacket, this.channel);
        this.currentTimeoutID = setTimeout(() => this._sendAndTimeout, this.timeoutTime);
    }

    /**
     * Receives a packet through a channel, taking action only if waiting for
     * an acknowledgment and if the packet is the corresponding acknowledgment for
     * the packet sent before.
     * @override
     * @param {Packet} packet - The packet received. 
     * @param {Channel} channel - The channel through wich the packet arrives.
     */
    receive(packet, channel){
        super.receive(packet, channel);
        if (this.isWaitingAck && !packet.isCorrupted && isAck(packet, this.currentSeqNum)){
            clearTimeout(this.currentTimeoutID);
            this.currentPacket = null;
            this.currentTimeoutID = null;
            // Change the state to enable sending the next sequence number
            this.isWaitingAck = false;
            this.currentSeqNum = (this.currentSeqNum + 1) % 2;
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
                ackNum: (this.expectedSeqNum + 1) % 2,
                isAck: true,
                sender: this,
                receiver: packet.sender
            })
            this.send(ack, channel);
        } else {
            this.onReceiveOk(packet, channel);
            const ack = new Packet({
                ackNum: this.expectedSeqNum,
                isAck: true,
                sender: this,
                receiver: packet.sender 
            });
            this.send(ack, channel);
            this.expectedSeqNum = (this.expectedSeqNum + 1) % 2;
        }
    }

}
