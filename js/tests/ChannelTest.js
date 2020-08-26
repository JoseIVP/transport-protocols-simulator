import Channel from "../src/Channel.js";
import Packet from "../src/Packet.js";
import Node from "../src/Node.js";

describe("Channel", function(){
    
    describe("#send()", function(){
        const channel = new Channel({delay: 1000});
        const receiver = new Node();
        const packet = new Packet({receiver, seqNum: 10});
        let packetReceived = null;
        receiver.onReceive = packet => {
            packetReceived = packet;
        };
        it("should send a packet to its receiver", async function(){
            should.not.exist(packetReceived);
            await channel.send(packet);
            packetReceived.should.equal(packet);
            packetReceived.should.have.property("seqNum").equal(10);
        });
    });

    describe("#stop()", function(){
        this.timeout(4500);
        const channel = new Channel({delay: 1500});
        const receiver = new Node();
        const timeBetweenPackets = 1000;
        const packets = [];
        for (let i = 0; i < 3; i++){
            packets.push(new Packet({
                seqNum: i,
                receiver
            }));
        }
        const receivedPackets = [];
        let undeliveredPacket = null;
        receiver.onReceive = packet => receivedPackets.push(packet);
        it("should stop sending the current packets", function(done){
            receivedPackets.should.have.lengthOf(0);
            should.not.exist(undeliveredPacket);
            // Start sending packets
            for(let i = 0; i < 3; i++){
                setTimeout(() => {
                    channel.send(packets[i])
                        .catch(packet => {
                            undeliveredPacket = packet;
                        });
                }, timeBetweenPackets * i);
            }
            // Stop sending packets before the third arrives
            setTimeout(() => {
                channel.stop();
            }, 3000);
            // The third packet should have arrived around 3500 ms from
            // the start if it wasn't stopped
            setTimeout(() => {
                receivedPackets.should.have.lengthOf(2);
                receivedPackets[0].should.have.property("seqNum").equal(0);
                receivedPackets[1].should.have.property("seqNum").equal(1);
                undeliveredPacket.should.equal(packets[2]);
                done()
            }, 4000);
        });
    });
})