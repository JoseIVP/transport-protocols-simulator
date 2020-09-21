/** @module "Node.js" */

/**
 * A class that represents a network node.
 */
class Node{

    /**
     * Makes the node receive a packet through a channel.
     * @param {Packet} packet - The packet to be received.
     * @param {Channel} channel - The channel that delivers the packet.
     */
    receive(packet, channel){
        this.onReceive(packet, channel);
    }

    /**
     * Override this function to intercept each received packet.
     * @param {Packet} packet - The packet received.
     * @param {Channel} channel - The channel through which the packet arrived. 
     */
    onReceive(packet, channel){
        return;
    }

    /**
     * Sends a packet through the specified channel, returning a boolean that
     * is true if the packet could enter the channel an false if not.
     * @param {Packet} packet - The packet to send. 
     * @param {Channel} channel - The channel through which the packet is sent.
     * @returns {boolean} - true if the packet entered the channel.
     */
    send(packet, channel){
        this.onSend(packet, channel);
        return channel.send(packet);
    }

    /**
     * Override this function to intercept each sent packet.
     * @param {Packet} packet - The sent packet. 
     * @param {Channel} channel - The channel through which the packet was sent.
     */
    onSend(packet, channel){
        return;
    }

}

export default Node;
