import Channel from "../src/Channel.js";
import Packet from "../src/Packet.js";
import Node from "../src/Node.js";

describe("Channel", function(){
    
    describe("#send()", function(){
        let channel,
        receiver,
        packet,
        packetReceived;

        beforeEach(function(){
            channel = new Channel({delay: 1000});
            receiver = new Node();
            receiver.onReceive = packet => {
                packetReceived = packet;
            };
            packet = new Packet({receiver, seqNum: 10});
            packetReceived = null;
        });

        it("should send a packet to its receiver with the configured delay", function(done){
            const didPacketEnter = channel.send(packet);
            didPacketEnter.should.be.a("boolean");
            didPacketEnter.should.be.true;
            setTimeout(()=>{
                packetReceived.should.equal(packet);
                packetReceived.should.have.property("seqNum").equal(10);
                done()
            }, 1000);
        });

        it("should compute if the packet is going to be lost given a probability", function(done){
            channel = new Channel({
                delay: 1000,
                lossProb: 1 // Every packet will be lost
            });
            let sentPacket = null;
            let packetWillBeLost = false;
            channel.onSend = (packet, willBeLost) => {
                sentPacket = packet;
                packetWillBeLost = willBeLost;
            };
            channel.send(packet);
            setTimeout(() => {
                sentPacket.should.equal(packet);
                packetWillBeLost.should.be.true;
                should.not.exist(packetReceived);
                done();
            }, 1100);
        });

        it("should compute whether the packet is going to be damaged given a probability", function(done){
            channel = new Channel({
                delay: 1000,
                damageProb: 1 // Every packet will be damaged
            });
            let sentPacket = null;
            let packetWillBeLost = false;
            let packetWillBeDamaged = false;
            channel.onSend = (packet, willBeLost, willBeDamaged) => {
                sentPacket = packet;
                packetWillBeLost = willBeLost;
                packetWillBeDamaged = willBeDamaged;
            };
            channel.send(packet);
            setTimeout(() => {
                sentPacket.should.equal(packet);
                packetWillBeLost.should.be.false;
                packetWillBeDamaged.should.be.true;
                packetReceived.should.equal(packet);
                packetReceived.should.have.property("isCorrupted").equal(true);
                done();
            }, 1100);
        });
    });

    describe("#losePacket()", function(){
        let channel,
        receiver,
        packet,
        packetReceived;

        beforeEach(function(){
            channel = new Channel({delay: 1000});
            receiver = new Node();
            receiver.onReceive = packet => {
                packetReceived = packet;
            }
            packet = new Packet({receiver});
            packetReceived = null;
        });

        it("should lose a traveling packet, preventing it from arriving at its receiver", function(done){
            channel.send(packet);
            channel.losePacket(packet);
            setTimeout(() => {
                should.not.exist(packetReceived);
                done();
            }, 1100);
        });

        it("should fire onPacketLost()", function(done){
            let lostPacket = null;
            channel.onPacketLost = packet => {
                lostPacket = packet;
            };
            channel.send(packet);
            channel.losePacket(packet);
            setTimeout(() => {
                should.not.exist(packetReceived);
                lostPacket.should.equal(packet);
                done();
            }, 1100);
        });
    });

    describe("#damagePacket()", function(){
        const channel = new Channel({delay: 1000});
        const receiver = new Node();
        let packetReceived = null;
        receiver.onReceive = packet => {
            packetReceived = packet;
        }
        const packet = new Packet({receiver});

        it("should damage a traveling packet", function(done){
            channel.send(packet);
            channel.damagePacket(packet);
            setTimeout(() => {
                packetReceived.should.equal(packet);
                packetReceived.should.have.property("isCorrupted").equal(true);
                done();
            }, 1000);
        });
    });

    describe("#stop()", function(){
        this.timeout(4500);
        const channel = new Channel({delay: 1500});
        const receiver = new Node();
        // Time between packets entering the channel
        const timeBetweenPackets = 1000;
        const packetsToSend = [];
        for (let i = 0; i < 3; i++){
            packetsToSend.push(new Packet({
                seqNum: i,
                receiver
            }));
        }
        const receivedPackets = [];
        let undeliveredPacket = null;
        receiver.onReceive = packet => receivedPackets.push(packet);
        channel.onPacketStopped = packet => {
            undeliveredPacket = packet;
        };
        it("should stop sending the current packets", function(done){
            // We will send 3 packets and stop before the third arrives.
            receivedPackets.should.have.lengthOf(0);
            should.not.exist(undeliveredPacket);
            // Start sending packets
            for(let i = 0; i < 3; i++){
                setTimeout(() => {
                    channel.send(packetsToSend[i]);
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
                undeliveredPacket.should.equal(packetsToSend[2]);
                done()
            }, 4000);
        });
    });
});