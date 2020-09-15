/** @module "goBackN.js" */

import Node from "./Node.js";
import Packet from "./Packet.js";


/**
 * A class that represents a *go-back-n* sender.
 */
export class GBNSender extends Node{

    /**
     * Creates a new SWSender instance.
     * @param {Object} options - The constructor options.
     * @param {GBNReceiver} options.receiver - The *go-back-n* receiver.
     * @param {number} [options.timeout=2100] - The time to wait for an acknowledgment from the receiver.
     * @param {Channel} options.sender - The channel through which to send the packets.
     * @param {number} [options.windowSize=1] - The size of the window.
     */
    constructor({
        receiver,
        timeout = 2100,
        channel,
        windowSize = 1
    }){
        super();
        this.currentTimeoutID = null;
        /** @member {SWReceiver} - The receiver of the packets. */
        this.receiver = receiver;
        /** @member {number} - The time to wait for the base sequence acknowledgment. */
        this.timeout = timeout;
        /** @member {Channel} - The channel through which the packets are sent. */
        this.channel = channel;
        /** @member {number} - The size of the window. */
        this.windowSize = windowSize
        /** @member {number} - The base sequence number, from wich the timer is set when sent. */
        this.base = 0;
        /** @member {number} - The next sequence number with wich to send a packet */
        this.nextSeqNum = 0;
    }

    /**
     * Sends a packet if the window is not full of unacknowledged packets.
     * If the sent packet corresponds to the base sequence, then it sets
     * a timer.
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
        }
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
        this.currentTimeoutID = setTimeout(() => {
            this._timeout();
        }, this.timeout);
    }

    /**
     * Receives a packet, clearing the timeout if it is a packet that acknowledges
     * all the current unacknowledged packets, and reseting the timeout if it
     * acknowledges the base sequence but not all.
     * @param {Packet} packet - The packet to receive.
     * @param {Channel} channel - The channel through which the packet is received.
     */
    receive(packet, channel){
        super.receive(packet, channel);
        if(!packet.isCorrupted && packet.isAck && packet.ackNum >= this.base && packet.ackNum < this.nextSeqNum){
            clearTimeout(this.currentTimeoutID);
            this.currentTimeoutID = null;
            this.base = packet.ackNum + 1;
            if(this.base < this.nextSeqNum)
                this._setTimeout();
        }
    }
}


/**
 * A class that represents a *go-back-n* receiver.
 */
export class GBNReceiver extends Node{

}