/** @module "Channel.js" */

/**
 * A class that represents the channels through wich the packets travel.
 */
class Channel{

    /**
     * Creates a new channel.
     * @param {Object} options - Options for the constructor.
     * @param {number} [options.delay=1000] - The time that takes the channel to deliver the packet.
     */
    constructor({
        delay = 1000
    }={}){
        /** @member {number} - The time that takes the channel to deliver the packet. */
        this.delay = delay;
        /** @member {Map} - The current travling packets. You should not modify this property in any way. */
        this.travelingPackets = new Map();
    }

    /**
     * Sends a packet to its receiver.
     * @param {Packet} packet - The for the channel to send.
     */
    send(packet){
        return new Promise((resolve, reject) => {
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

}

export default Channel;
