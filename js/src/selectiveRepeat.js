/** @module "stopAndWait.js"  */

import Node from "./Node.js";
import Packet from "./Packet.js";

/**
 * A class that implements the sender of *selective-repeat*.
 */
export class SRSender extends Node{

    /**
     * Creates a new SRSender instance.
     * @param {Object} options - The constructor options.
     * @param {GBNReceiver} options.receiver - The *selective-repeat* receiver.
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
        /** @member {SWReceiver} - The receiver of the packets. */
        this.receiver = receiver;
        /** @member {number} - The time to wait for each packet acknowledgment. */
        this.timeout = timeout;
        /** @member {Channel} - The channel through which the packets are sent. */
        this.channel = channel;
        /** @member {number} - The size of the window. */
        this.windowSize = windowSize
        /** @member {number} - The base sequence number of the current window. */
        this.base = 0;
        /** @member {number} - The next sequence number with wich to send a packet. */
        this.nextSeqNum = 0;
        /**
         * @member {Map} - A map with sequence numbers as keys and timeout IDs as
         * values, representing the unacknowledged sent sequences of the window.
         * @private
         */
        this._windowTimeouts = new Map();
    }

    /**
     * Sends a packet if the current window is not full, returning true, else
     * no packet is sent and returns false. When a packet is sent it sets a timer
     * and increments nextSeqNum by one.
     * @returns {boolean} - true if a packet is sent, false if not.
     */
    send(){
        // For simplicity we use integers from 0
        // as the sequence numbers for the packets.
        if(this.nextSeqNum < this.base + this.windowSize){
            this._senAndTimeout(this.nextSeqNum);
            this.nextSeqNum++;
            return true;
        }
        return false;
    }

    _senAndTimeout(seqNum){
        // Send a new packet, and set and store the timeout ID
        super.send(new Packet({
            seqNum,
            sender: this,
            receiver: this.receiver
        }), this.channel);
        const timeoutID = setTimeout(() => {
            this._senAndTimeout(seqNum);
        }, this.timeout);
        this._windowTimeouts.set(seqNum, timeoutID);
    }

    /**
     * Stops all the current timeouts.
     */
    stop(){
        this._windowTimeouts.forEach(timeoutID =>{
            clearTimeout(timeoutID);
        });
        this._windowTimeouts.clear();
    }

    /**
     * Receives a packet. If the packet is corrupted or does not correspond
     * to one of the unacknowledged packets in the window, then it is
     * ignored. If the packet correctly acknowledges the base sequence
     * of the window, then the window is moved to the smallest unacknowledged
     * sequence. If the packet correctly acknowledges one of the sequences in
     * the window, then its timeout is unset.
     * @param {Packet} packet - The packet to receive.
     * @param {Channel} channel - The channel through which the packet is received. 
     */
    receive(packet, channel){
        if(!packet.isCorrupted && packet.isAck && this._windowTimeouts.has(packet.ackNum)){
            const timeoutID = this._windowTimeouts.get(packet.ackNum);
            clearTimeout(timeoutID);
            this._windowTimeouts.delete(packet.ackNum);
            if(packet.ackNum == this.base){
                // The smallest unacknowledged sequence is at most nextSeqNum
                // and if it's smaller than that then it has a timeout, because
                // we remove the timeouts of acknowledged sequences.
                while(this.base < this.nextSeqNum && !this._windowTimeouts.has(this.base)){
                    this.base++;
                }
            }
            this.onReceive(packet, channel, true);
        }else{
            this.onReceive(packet, channel, false);
        }
    }

    /**
     * Override this method to intercept received packets. A packet is ok if it
     * is an acknowledgment for one of the unacknowledged sent sequences of the
     * current window and is not corrupted.
     * @param {Packet} packet - The received packet.
     * @param {Channel} channel - The channel through which the packet was received.
     * @param {boolean} isOk - true if the packet is ok, false if not.
     */
    onReceive(packet, channel, isOk){
        return;
    }
}


/**
 * A class that implements the receiver of *selective-repeat*.
 */
export class SRReceiver extends Node{

} 