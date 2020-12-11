/** @module Channel */

import { Timeout } from "./utils.js";


/**
 * A class that contains the timeouts for a packet in a channel.
 * @private
 */
class PacketTimeouts{

    /** @member {Timeout} - The timeout for damaging a packet. */
    damage;
    /** @member {Timeout} - The timeout for losing a packet. */
    lose;
    /** @member {Timeout} - The timeout for deliverig a packet */
    deliver;

    /** Pauses all the timeouts. */
    pause(){
        this.damage?.pause();
        this.lose?.pause();
        this.deliver.pause();
    }

    /** Resumes all the timeouts. */
    resume(){
        this.damage?.resume();
        this.lose?.pause();
        this.deliver?.pause();
    }

    /** Stops all the timeouts. */
    stop(){
        this.damage?.stop();
        this.lose?.stop();
        this.deliver?.stop();
    }
}


/**
 * A class that represents the channels through which the packets travel.
 */
class Channel{

    /** 
     * @member {number} - The time in milliseconds that takes the channel to
     * deliver the packet.
     */
    delay;
    /** @member {number} - The probability of losing a packet. */
    lossProb;
    /** @member {number} - The probability of damaging a packet. */
    damageProb;
    /**
     * @member {Map} - A map with the current traveling packets as keys and
     * PacketTimeouts as values.
     * @private
     */
    _travelingPackets = new Map();


    /**
     * Creates a new channel.
     * @param {Object} [options] - The options for the constructor.
     * @param {number} [options.delay=1000] - The time that takes the channel to
     * deliver the packet.
     * @param {number} [options.lossProb=0] - The probability between 0 and 1 to
     * lose a packet.
     * @param {number} [options.damageProb=0] - The probability between 0 and 1
     * of damaging a packet.
     */
    constructor({
        delay = 1000,
        lossProb = 0,
        damageProb = 0
    }={}){
        this.delay = delay;  
        this.lossProb = lossProb;
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
     * Returns a number between 1/4 and 3/4 of the delay. Used to randomly lose
     * or damage a packet around the middle of the trajectory, so suddenly
     * losing or damaging a packet just before delivery or after emission
     * doesn't happen in the visualization.
     * @returns {number} - The random time.
     * @private
     */
    _getRandomTime(){
        return this.delay / 4 + Math.random() * this.delay / 2;
    }

    /**
     * Sends a packet through the channel.
     * @param {Packet} packet - The packet to send.
     */
    send(packet){
        const timeouts = new PacketTimeouts();
        if(Math.random() < this.lossProb){
            // The packet is going to be lost
            timeouts.lose = new Timeout(this._getRandomTime(),
                () => this.losePacket(packet));
        }else{
            if(Math.random() < this.damageProb){
                // The packet is going to be damaged
                timeouts.damage = new Timeout(this._getRandomTime(),
                    () => this.damagePacket(packet));
            }
            timeouts.deliver = new Timeout(this.delay, () => {
                this._travelingPackets.delete(packet);
                packet.receiver.receive(packet);
            });
        }
        this._travelingPackets.set(packet, timeouts);
    }

    /**
     * Stops sending the current traveling packets, preventing them from
     * arriving at their receiver. It executes onPacketStopped() for each of the
     * stopped packets and removes the packets from the channel.
     */
    stop(){
        this._travelingPackets.forEach((timeouts, packet) =>{
            timeouts.stop();
            this.onPacketStopped(packet);
        });
        this._travelingPackets.clear();
    }

    /**
     * A callback that is called when a packet is stopped.
     * @param {Packet} packet - The stopped packet.
     */
    onPacketStopped(packet){
        return;
    }

    /**
     * Loses a packet, preventing it from arriving at its receiver, and
     * callining onPacketLost() with the packet as parameter. If the packet is
     * not currently traveling in this channel, then it does nothing. Returns
     * true if the packet was traveling and was stopped, and false if the packet
     * was not traveling.
     * @param {Packet} packet - The packet to lose.
     * @returns {boolean} - true if the packet was traveling, false if not.
     */
    losePacket(packet){
        const timeouts = this._travelingPackets.get(packet);
        if(timeouts !== undefined){
            this._travelingPackets.delete(packet);
            timeouts.stop();
            this.onPacketLost(packet);
            return true;
        }
        return false;
    }

    /**
     * A callback that is called every time a packet is lost.
     * @param {Packet} packet - The lost packet. 
     */
    onPacketLost(packet){
        return;
    }

    /**
     * Damages a packet. Does nothing if the packet is not currently traveling
     * in this channel. If the packet is traveling and is damaged, calls
     * onPacketDamaged() and returns true, otherwise returns false.
     * @param {Packet} packet - The packet to damage.
     * @returns {boolean} - true if the packet was traveling, false if not.
     */
    damagePacket(packet){
        const timeouts = this._travelingPackets.get(packet);
        if(timeouts !== undefined){
            timeouts.damage?.stop();;
            packet.damage();
            this.onPacketDamaged(packet);
            return true;
        }
        return false;
    }

    /**
     * A callback that is called every time a packet is damaged.
     * @param {Packet} packet - The damaged packet. 
     */
    onPacketDamaged(packet){
        return;
    }

    /**
     * Pauses the timeouts of the current traveling packets.
     */
    pause(){
        this._travelingPackets.forEach(timeouts => timeouts.pause());
    }

    /**
     * Resumes the timeouts of the current traveling packets.
     */
    resume(){
        this._travelingPackets.forEach(timeouts => timeouts.resume());
    }

}

export default Channel;
