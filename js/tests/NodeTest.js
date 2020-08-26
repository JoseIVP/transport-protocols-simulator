import Node from "../src/Node.js";
import Packet from "../src/Packet.js";
import Channel from "../src/Channel.js";


describe("Node", function(){

    describe("#receive()", function(){
        const receiver = new Node();
        const packet = "packet";
        const channel = "channel";
        let packetReceived = null;
        let deliveringChannel = null;
        receiver.onReceive = function(packet, channel){
            packetReceived = packet;
            deliveringChannel = channel;
        };
        it("should receive a packet through a channel and fire onReceive", function(){
            should.not.exist(packetReceived);
            should.not.exist(deliveringChannel);
            receiver.receive(packet, channel);
            packetReceived.should.equal(packet);
            deliveringChannel.should.equal(channel);
        });
    });

    describe("#send()", function(){
        const sender = new Node();
        const receiver = new Node();
        const packet = new Packet({
            receiver,
            seqNum: 12
        });
        let packetSended = null;
        let sendingChannel = null;
        sender.onSend = (packet, channel) => {
            packetSended = packet;
            sendingChannel = channel;
        };
        let packetReceived = null;
        let deliveringChannel = null;
        receiver.onReceive = (packet, channel) => {
            packetReceived = packet;
            deliveringChannel = channel;
        };
        const channel = new Channel();
        it("should send a packet through a channel and fire onSend", async function(){
            should.not.exist(packetSended);
            should.not.exist(packetReceived);
            should.not.exist(sendingChannel);
            should.not.exist(deliveringChannel);
            await sender.send(packet, channel);
            packetSended.should.equal(packet);
            packetReceived.should.equal(packet);
            packetSended.should.have.property("seqNum").equal(12);
            packetReceived.should.have.property("seqNum").equal(12);
            sendingChannel.should.equal(channel);
            deliveringChannel.should.equal(channel);
        });
    });

})