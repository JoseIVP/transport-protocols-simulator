/** @module "goBackN.js" */

import Node from "./Node.js";
import Packet from "./Packet.js";


/**
 * A class that represents a *go-back-n* sender.
 */
export class GBNSender extends Node{

    /**
     * Creates a new GBNSender instance.
     * @param {Object} options - The constructor options.
     * @param {GBNReceiver} options.receiver - The *go-back-n* receiver.
     * @param {number} [options.timeout=2100] - The time to wait for an acknowledgment from the receiver.
     * @param {Channel} options.channel - The channel through which to send the packets.
     * @param {number} [options.windowSize=1] - The size of the window.
     */
    constructor({
        receiver,
        timeout = 2100,
        channel,
        windowSize = 1
    }){
        super();
        this._currentTimeoutID = null;
        /** @member {SWReceiver} - The receiver of the packets. */
        this.receiver = receiver;
        /** @member {number} - The time to wait for the base sequence acknowledgment. */
        this.timeout = timeout;
        /** @member {Channel} - The channel through which the packets are sent. */
        this.channel = channel;
        /** @member {number} - The size of the window. */
        this.windowSize = windowSize
        /** @member {number} - The base sequence number, from which the timer is set when sent. */
        this.base = 0;
        /** @member {number} - The next sequence number with which to send a packet */
        this.nextSeqNum = 0;
    }

    /**
     * Sends a packet if the window is not full of unacknowledged packets.
     * If the sent packet corresponds to the base sequence, then it sets
     * a timer. It returns false if it is not sending a packet because
     * the window is full, and returns true otherwise.
     * @returns {boolean} - true if a packet was sent, false if not.
     */
    send(){
        // For simplicity we use integers from 0 to the maximum integer
        // as the sequence numbers for the packets.
        if(this.nextSeqNum < this.base + this.windowSize){
            super.send(new Packet({
                seqNum: this.nextSeqNum,
                sender: this,
                receiver: this.receiver, 
            }), this.channel);
            if(this.base == this.nextSeqNum)
                this._setTimeout();
            this.nextSeqNum++;
            this.onStateChange();
            return true;
        }
        return false;
    }

    /**
     * Sends all the packets from base to nextSeqNum - 1, and
     * sets the timer.
     * @private
     */
    _timeout(){
        for(let i=this.base; i<this.nextSeqNum; i++){
            super.send(new Packet({
                seqNum: i,
                sender: this,
                receiver: this.receiver
            }), this.channel);
        }
        this._setTimeout();
    }

    _setTimeout(){
        this._currentTimeoutID = setTimeout(() => {
            this._timeout();
        }, this.timeout);
    }

    /**
     * Receives a packet, clearing the timeout if it is a packet that acknowledges
     * all the current unacknowledged packets, and reseting the timeout if it
     * acknowledges the base sequence but not all.
     * If the packet is not corrupted, is an acknowledgement and its acknowledgment
     * number is one of the unacknowledged sent sequences, then the third
     * argument for the onReceive() callback will be true, otherwise it will be
     * false.
     * @param {Packet} packet - The packet to receive.
     * @param {Channel} channel - The channel through which the packet is received.
     */
    receive(packet, channel){
        if(!packet.isCorrupted && packet.isAck && packet.ackNum >= this.base && packet.ackNum < this.nextSeqNum){
            this.onReceive(packet, channel, true);
            clearTimeout(this._currentTimeoutID);
            this._currentTimeoutID = null;
            this.base = packet.ackNum + 1;
            if(this.base < this.nextSeqNum)
                this._setTimeout();
            this.onStateChange();
        }else{
            this.onReceive(packet, channel, false);
        }
    }

    /**
     * Stops the current timeout.
     */
    stop(){
        clearTimeout(this._currentTimeoutID);
        this._currentTimeoutID = null;
    }
}


/**
 * A class that represents a *go-back-n* receiver.
 */
export class GBNReceiver extends Node{

    /**
     * Creates a new GBNReceiver instance.
     */
    constructor(){
        super();
        /** @member {number} - The next sequence number expected from the sender. */
        this.expectedSeqNum = 0;
    }

    /**
     * Receives a packet and sends back an acknowledgment, corresponding to the
     * received packet sequence number if it is the expected one, or sending the
     * previous sequence number if it is not.
     * If the packet is the expected one, then the third argument for the
     * onReceive() callback will be true, else it will be false.
     * @param {Packet} packet - The packet to receive.
     * @param {Channel} channel - The channel through which the packet is received.
     */
    receive(packet, channel){
        if(!packet.isCorrupted && packet.seqNum == this.expectedSeqNum){
            this.onReceive(packet, channel, true);
            this.send(new Packet({
                sender: this,
                receiver: packet.sender,
                isAck: true,
                ackNum: this.expectedSeqNum
            }), channel);
            this.expectedSeqNum++;
            this.onStateChange();
        }else{
            this.onReceive(packet, channel, false);
            this.send(new Packet({
                sender: this,
                receiver: packet.sender,
                isAck: true,
                ackNum: this.expectedSeqNum - 1
            }), channel);
        }
    }
}
