/** @module Packet */

/**
 * A class that represents a network packet.
 */
class Packet{

    /**
     * Creates a new packet.
     * @param {Object} [options] - Options for the constructor.
     * @param {number} options.seqNum - The sequence number of the packet.
     * @param {Node} options.sender - The sender of the packet.
     * @param {Node} options.receiver - The receiver of the packet.
     * @param {boolean} [options.isAck=false] - true if the packet is an acknowledgment.
     * @param {boolean} [options.ackNum=null] - The sequence number to acknowledge.
     */
    constructor({
        seqNum,
        sender,
        receiver,
        isAck = false,
        ackNum = null,
    }={}){
        /** @member {number} - The sequence number of the packet. */
        this.seqNum = seqNum;
        /** @member {Node} - The sender of the packet. */
        this.sender = sender;
        /** @member {Node} - The receiver of the packet. */
        this.receiver = receiver;
        /** @member {boolean} - true if the packet is an acknowledgment, false otherwise. */
        this.isAck = isAck;
        /** @member {number} - The sequence number to acknowledge. */
        this.ackNum = ackNum;
        /** @member {booblean} - true if the packet is corrupted, false if not. */
        this.isCorrupted = false;
    }

    /**
     * Turns packet.isCorrupted true.
     */
    getCorrupted(){
        this.isCorrupted = true;
    }

}

export default Packet;