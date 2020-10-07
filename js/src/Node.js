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
        this.onReceive(packet, channel, true);
    }

    /**
     * Override this function to intercept each received packet.
     * When extending Node, this should be the first function to
     * be called after determining whether the packet was correctly
     * received or not. Because of the latter, you should not
     * modify the given packet.
     * @param {Packet} packet - The received Packet.
     * @param {Channel} channel - The channel through which the packet arrived.
     * @param {boolean} isOk - true if the packet was correctly received.
     */
    onReceive(packet, channel, isOk){
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
        const isOk = channel.send(packet);
        this.onSend(packet, channel, isOk);
        return isOk;
    }

    /**
     * Override this function to intercept each sent packet.
     * @param {Packet} packet - The sent packet. 
     * @param {Channel} channel - The channel through which the packet was sent.
     * @param {boolean} isOk - true if the packet entered the channel, false if not.
     */
    onSend(packet, channel, isOk){
        return;
    }

}

export default Node;
