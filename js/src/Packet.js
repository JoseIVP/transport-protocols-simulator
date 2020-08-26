/** @module "Packet.js" */

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
     * @param {boolean} [options.isAck=true] - true if the packet is an acknowledgement.
     */
    constructor({
        seqNum,
        sender,
        receiver,
        isAck = false,
    }={}){
        /** @member {number} - The sequence number of the packet. */
        this.seqNum = seqNum;
        /** @member {Node} - The sender of the packet. */
        this.sender = sender;
        /** @member {Node} - The receiver of the packet. */
        this.receiver = receiver;
        /** @member {boolean} - true if the packet is an acknowledgement, false otherwise. */
        this.isAck = isAck;
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
