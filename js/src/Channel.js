/** @module "Channel.js" */

/**
 * A class that represents the channels through which the packets travel.
 */
class Channel{

    /**
     * Creates a new channel.
     * @param {Object} options - Options for the constructor.
     * @param {number} [options.delay=1000] - The time that takes the channel to deliver the packet.
     * @param {number} [options.lossProb=0] - The probability between 0 and 1 to lose a packet.
     * @param {number} [options.damageProb=0] - The probability between 0 and 1 of damaging a packet.
     */
    constructor({
        delay = 1000,
        lossProb = 0,
        damageProb = 0
    }={}){
        /** @member {number} - The time in milliseconds that takes the channel to deliver the packet. */
        this.delay = delay;
        /**
         * @member {Map} - The current travling packets.
         * @private
         */
        this._travelingPackets = new Map();
        /** @member {number} - The probability to lose a packet. */
        this.lossProb = lossProb;
        /** @member {number} - The probability of damaging a packet. */
        this.damageProb = damageProb;
    }

    /**
     * Returns an iterator for the current traveling packets.
     * @returns {Iterator} - The returned iterator.
     */
    getTravelingPackets(){
        return this._travelingPackets.keys();
    }

    /**
     * Sends a packet to its receiver, returning a boolean that is true
     * if the packet entered the channel and false if not. For now, the
     * implementation makes all the packets enter the channel.
     * @param {Packet} packet - The packet for the channel to send.
     * @returns {boolean} - true if the packet entered the channel.
     */
    send(packet){
        const isLosingPacket = Math.random() < this.lossProb;
        const isDamagingPacket = Math.random() < this.damageProb;
        this.onSend(packet, isLosingPacket, isDamagingPacket);
        let timeoutID = null;
        if(isLosingPacket){
            timeoutID = setTimeout(() => {
                this.losePacket(packet);
            }, this.delay / 2);
        }else{
            if(isDamagingPacket)
                packet.getCorrupted();
            timeoutID = setTimeout(() => {
                this._travelingPackets.delete(packet);
                packet.receiver.receive(packet, this);
            }, this.delay);
        }
        this._travelingPackets.set(packet, {timeoutID});
        return true;
    }

    /**
     * Override this method to intercept a packet sent through
     * the channel, to know whether it is going to be lost or
     * not, and if it is going to be damaged.
     * The channel is actually only going to damage the packet if it
     * is not losing it, despite damagingPacket being true.
     * @param {Packet} packet - The packet that is sent.
     * @param {boolean} losingPacket - true if the channel is goin to lose the packet, false otherwise.
     * @param {boolean} damagingPacket - true if the channel is going to damage the packet, false if not.
     */
    onSend(packet, losingPacket, damagingPacket){
        return
    }

    /**
     * Stops sending the current traveling packets, preventing them
     * from arriving at their receiver. It executes onPacketStopped()
     * for each of the stopped packets.
     */
    stop(){
        this._travelingPackets.forEach(({timeoutID}, packet) =>{
            clearTimeout(timeoutID);
            this.onPacketStopped(packet);
        });
        this._travelingPackets.clear();
    }

    /**
     * Override this method to intercept a stopped packet.
     * @param {Packet} packet - The stopped packet.
     */
    onPacketStopped(packet){
        return
    }

    /**
     * Loses a packet, preventing it from arriving at its receiver, and
     * firing onPacketLost() with the packet as parameter.
     * If the packet is not currently traveling in this channel, then
     * it does nothing. Returns true if the packet was traveling and
     * was stopped, and false if the packet was not traveling.
     * @param {Packet} packet - The packet to lose.
     * @returns {boolean} - true if the packet was traveling, false if not.
     */
    losePacket(packet){
        const info = this._travelingPackets.get(packet);
        if(info !== undefined){
            this._travelingPackets.delete(packet);
            clearTimeout(info.timeoutID);
            this.onPacketLost(packet);
            return true;
        }
        return false;
    }

    /**
     * Override this method to intercept lost packets.
     * @param {Packet} packet - The lost packet. 
     */
    onPacketLost(packet){
        return
    }

    /**
     * Damages a packet. Does nothing if the packet is not currently
     * traveling in this channel.
     * @param {Packet} packet - The packet to damage.
     */
    damagePacket(packet){
        if(this._travelingPackets.has(packet))
            packet.getCorrupted();
    }

}

export default Channel;
