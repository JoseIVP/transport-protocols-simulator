/** @module Packet */

/**
 * A class that represents a network packet.
 */
class Packet{

    /** @member {number} - The sequence number of the packet. */
    seqNum;
    /** @member {AbstractARQNode} - The sender of the packet. */
    sender;
    /** @member {AbstractARQNode} - The receiver of the packet. */
    receiver;
    /**
     * @member {boolean} - true if the packet is an acknowledgment, false
     * otherwise.
     */
    isAck;
    /** @member {number} - The sequence number to acknowledge. */
    ackNum;
    /** @member {booblean} - true if the packet is corrupted, false if not. */
    isCorrupted = false;
    /** @member {boolean} - true if the packet was re-sent. */
    wasReSent;
    /**
     * @member {boolean} - true if the packet is a cumulative acknowledgment.
     */
    isCAck;

    /**
     * Creates a new packet.
     * @param {Object} options - Options for the constructor.
     * @param {number} options.seqNum - The sequence number of the packet.
     * @param {AbstractARQNode} options.sender - The sender of the packet.
     * @param {AbstractARQNode} options.receiver - The receiver of the packet.
     * @param {boolean} [options.isAck=false] - true if the packet is an
     * acknowledgment.
     * @param {boolean} [options.ackNum=null] - The sequence number to
     * acknowledge.
     * @param {boolean} [options.wasReSent=false] - true if the packet was
     * re-sent.
     * @param {boolean} [options.isCAck=false] - true if the packet is a
     * cumulative acknowledgment.
     */
    constructor({
        seqNum,
        sender,
        receiver,
        isAck = false,
        ackNum = null,
        wasReSent = false,
        isCAck = false,
    }){
        this.seqNum = seqNum;
        this.sender = sender;
        this.receiver = receiver;
        this.isAck = isAck;
        this.ackNum = ackNum;
        this.wasReSent = wasReSent;
        this.isCAck = isCAck;
    }

    /**
     * Turns packet.isCorrupted true.
     */
    damage(){
        this.isCorrupted = true;
    }

}

export default Packet;
