/** @module "Channel.js" */

/**
 * A class that represents the channels through wich the packets travel.
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
        /** @member {Map} - The current travling packets. You should not modify this property in any way. */
        this.travelingPackets = new Map();
        /** @member {number} - The probability to lose a packet. */
        this.lossProb = lossProb;
        /** @member {number} - The probability of damaging a packet. */
        this.damageProb = damageProb;
    }

    /**
     * Sends a packet to its receiver, returning a promise that resolves if the
     * packet is successfully delivered and rejects if the packet could not get
     * delivered because stop() was called or the packet was lost. The returned
     * promise resolves or rejects with the given packet.
     * @param {Packet} packet - The for the channel to send.
     * @returns {Promise} - The pending promise.
     */
    send(packet){
        const isLosingPacket = Math.random() < this.lossProb;
        const isDamagingPacket = Math.random() < this.damageProb;
        this.onSend(packet, isLosingPacket, isDamagingPacket);
        return new Promise((resolve, reject) => {
            if(isLosingPacket){
                reject(packet);
                return;
            }
            if(isDamagingPacket)
                packet.getCorrupted();
            const timeoutID = setTimeout(() =>{
                this.travelingPackets.delete(packet);
                packet.receiver.receive(packet, this);
                resolve(packet);
            }, this.delay);
            this.travelingPackets.set(packet, {
                timeoutID,
                reject
            });
        });
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
     * from arriving at their receiver.
     */
    stop(){
        this.travelingPackets.forEach(({timeoutID, reject}, packet) =>{
            clearTimeout(timeoutID);
            reject(packet);
        });
        this.travelingPackets.clear();
    }

    /**
     * Loses a packet, preventing it from arriving at its receiver, and
     * causing the corresponding promise from send() to be rejected.
     * If the packet is not currently traveling in this channel, then
     * it does nothing. Returns true if the packet was traveling and
     * was stopped, and false if the packet was not traveling.
     * @param {Packet} packet - The packet to lose.
     * @returns {boolean} - true if the packet was traveling, false if not.
     */
    losePacket(packet){
        const info = this.travelingPackets.get(packet);
        if(info !== undefined){
            this.travelingPackets.delete(packet);
            clearTimeout(info.timeoutID);
            info.reject(packet);
            return true;
        }
        return false;
    }

    /**
     * Damages a packet. Does nothing if the packet is not currently
     * traveling in this channel.
     * @param {Packet} packet - The packet to damage.
     */
    damagePacket(packet){
        if(this.travelingPackets.has(packet))
            packet.getCorrupted();
    }

}

export default Channel;
