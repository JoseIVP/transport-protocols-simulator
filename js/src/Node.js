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
     * @param {Channel} channel - The channel through wich the packet arrived. 
     */
    onReceive(packet, channel){
        return;
    }

    /**
     * Sends a packet through the specified channel, returning the promise
     * returned by channel.send().
     * @param {Packet} packet - The packet to send. 
     * @param {Channel} channel - The channel through wich the packet is sent.
     * @returns {Promise} - The promise returned by channel.send().
     */
    send(packet, channel){
        this.onSend(packet, channel);
        return channel.send(packet);
    }

    /**
     * Override this function to intercept each sent packet.
     * @param {Packet} packet - The sent packet. 
     * @param {Channel} channel - The channel through wich the packet was sent.
     */
    onSend(packet, channel){
        return;
    }

}

export default Node;
