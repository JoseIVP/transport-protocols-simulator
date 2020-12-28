import Channel from "../src/Channel.js";
import Packet from "../src/Packet.js";
import SimpleReceiver from "../src/SimpleReceiver.js";
import { sleep } from "../src/utils.js";


describe("Channel", function(){
    
    describe("#send()", function(){
        let receivedPkt = null;
        const channel = new Channel({delay: 500});
        const receiver = new SimpleReceiver();
        receiver.onReceive = packet => receivedPkt = packet;
        const packet = new Packet({receiver, seqNum: 10});
        it("should send a packet to its receiver with the configured delay", async function(){
            channel.send(packet);
            await sleep(500);
            receivedPkt.should.equal(packet);
            receivedPkt.should.have.property("seqNum").equal(10);
        });
    });

    describe("#losePacket()", function(){
        let channel,
        receiver,
        packet,
        receivedPkt,
        lostPkt;

        beforeEach(function(){
            channel = new Channel({delay: 500});
            receiver = new SimpleReceiver();
            receiver.onReceive = packet => receivedPkt = packet;
            channel.onPacketLost = packet => lostPkt = packet;
            packet = new Packet({receiver});
            receivedPkt = null;
            lostPkt = null;
        });

        it(`should prevent a given traveling packet from arriving at its
            receiver, and fire onPacketLost()`, async function(){
            channel.send(packet);
            // Returns true if the packet was traveling
            channel.losePacket(packet).should.be.true;
            lostPkt.should.equal(packet);
            await sleep(600);
            should.not.exist(receivedPkt);
        });

        it(`should return false, and not call onPacketLost() when the given
            packet is not in the channel`, async function(){
            channel.send(packet);
            channel.losePacket(new Packet({})).should.be.false;
            should.not.exist(lostPkt);
            await sleep(500);
            receivedPkt.should.equal(packet);
        });
    });

    describe("#damagePacket()", function(){
        let channel,
        receiver,
        packet,
        receivedPkt,
        damagedPkt;

        beforeEach(function(){
            channel = new Channel({delay: 500});
            receiver = new SimpleReceiver();
            receiver.onReceive = packet => receivedPkt = packet;
            channel.onPacketDamaged = packet => damagedPkt = packet;
            packet = new Packet({receiver});
            receivedPkt = null;
            damagedPkt = null;
        });
        
        it("should damage a given traveling packet, and fire onPacketDamaged()",
            async function(){
            channel.send(packet);
            // If the packet was traveling should return true
            channel.damagePacket(packet).should.be.true;
            damagedPkt.should.equal(packet);
            damagedPkt.should.have.property("isCorrupted").equal(true);
            await sleep(500);
            receivedPkt.should.equal(packet);
            receivedPkt.should.have.property("isCorrupted").equal(true);
        });

        it(`should return false, and not call onPacketDamaged() when the given
            packet is not in the channel`, async function(){
            channel.send(packet);
            channel.damagePacket(new Packet({})).should.be.false;
            should.not.exist(damagedPkt);
            await sleep(500);
            receivedPkt.should.equal(packet);
            receivedPkt.should.have.property("isCorrupted").equal(false);
        });
    });

    describe("#stop()", function(){
        const receivedPkts = [];
        const sentPkts = [];
        const stoppedPkts = [];
        const channel = new Channel({delay: 500});
        channel.onPacketStopped = packet => stoppedPkts.push(packet);
        const receiver = new SimpleReceiver();
        receiver.onReceive = packet => receivedPkts.push(packet);
        it(`should stop sending the current packets, and fire onPacketStopped()
            for each one`,  async function(){
            // Send 4 packets and stop before the last 2 arrive
            for(let i=0; i<4; i++){
                const pkt = new Packet({receiver});
                channel.send(pkt);
                sentPkts.push(pkt);
                await sleep(100);
            }// 400 ms have passed
            await sleep(250);
            channel.stop(); // 650 ms have passed
            receivedPkts.should.have.lengthOf(2);
            await sleep(250);
            // 900 ms have passed, if not stopped packets 3 and 4 should have
            // arrived at 700 and 800 ms
            receivedPkts.should.have.lengthOf(2);
            sentPkts[2].should.be.oneOf(stoppedPkts);
            sentPkts[3].should.be.oneOf(stoppedPkts);
        });
    });
});
