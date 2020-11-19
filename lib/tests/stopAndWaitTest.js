import Channel from "../src/Channel.js";
import {
    SWSender,
    SWReceiver,
} from "../src/stopAndWait.js";
import Node from "../src/Node.js";
import Packet from "../src/Packet.js";

describe("stopAndWait.js", function(){
    
    describe("SWSender", function(){
    
        describe("#send()", function(){
            let receiver,
            channel,
            sender,
            receivedPacket,
            sentPackets;
            
            beforeEach(function(){
                receiver = new Node();
                receiver.onReceive = packet => {
                    receivedPacket = packet;
                };
                channel = new Channel({delay: 1000});
                sender = new SWSender({
                    receiver,
                    channel,
                    timeout: 2100 // A bit more than the round trip time
                });
                sender.onSend = packet => {
                    sentPackets.push(packet);
                };
                receivedPacket = null;
                sentPackets = [];
            });
    
            it("should send a packet through its channel to its receiver", function(done){
                this.timeout(1200);
                // This should be the initial state of the sender
                sender.should.have.property("currentSeqNum").equal(0);
                sender.should.have.property("isWaitingAck").equal(false);
                sender.send();
                // The sender should have changed its state
                sender.should.have.property("currentSeqNum").equal(0);
                sender.should.have.property("isWaitingAck").equal(true);
                // Prevent it from resending packets
                sender.stop();
                setTimeout(()=>{
                    receivedPacket.should.have.property("seqNum").equal(0);
                    sentPackets.should.have.lengthOf(1);
                    done();
                }, 1100);
            });

            it("should set a timeout for sending a new packet for the current unacknowledged sequence", function(done){
                this.timeout(3300);
                sender.send();
                channel.losePacket(sentPackets[0]);
                setTimeout(() => {
                    // The receiver should have not received any packets
                    should.not.exist(receivedPacket);
                }, 1100);
                setTimeout(()=> {
                    // Prevent next timeouts from happening
                    sender.stop();
                    sentPackets.should.have.lengthOf(2);
                    // The re-sent packet should be a new one, with the same sequence
                    sentPackets[0].should.not.equal(sentPackets[1]);
                    sentPackets[0].should.have.property("seqNum").equal(0);
                    sentPackets[1].should.have.property("seqNum").equal(0);
                    // Now the receiver should have received the re-sent packet
                    receivedPacket.should.equal(sentPackets[1]);
                    done();
                }, 3200);
            });

            it("should return a boolean that is true if a packet could be sent and false if not", function(done){
                // We will try to send two packets, one immediately after the other,
                // and therefore the first should be sent and the second should not, because
                // the sender will be waiting for the acknowledgment of the first.
                const firstWasSent = sender.send();
                const secondWasSent = sender.send();
                firstWasSent.should.be.true;
                secondWasSent.should.be.false;
                sender.should.have.property("isWaitingAck").equal(true);
                // Prevent resending timeouts from happening:
                sender.stop();
                setTimeout(() => {
                    sentPackets.should.have.lengthOf(1);
                    receivedPacket.should.equal(sentPackets[0]);
                    receivedPacket.should.have.property("seqNum").equal(0);
                    done();
                }, 1100);
            });
    
        });
    
        describe("#receive()", function(){
            let receiver,
            channel,
            sender,
            ack,
            receivedAck;

            beforeEach(function(){
                receiver = new Node();
                channel = new Channel({delay: 1000});
                sender = new SWSender({
                    receiver,
                    channel,
                });
                // Each test will further configure the acknowledgment
                ack = new Packet({
                    sender: receiver,
                    receiver: sender,
                    isAck: true
                });
                receiver.onReceive = () => receiver.send(ack, channel);
                receivedAck = null;
                sender.onReceive = packet => {
                    receivedAck = packet;
                };
            });

            it("should receive an acknowledgment after sending a packet", function(done){
                this.timeout(2200);
                // Configure the acknowledgment and send a packet
                ack.ackNum = 0;
                ack.isAck = true;
                sender.send();
                setTimeout(() => {
                    receivedAck.should.have.property("ackNum").equal(0);
                    receivedAck.should.have.property("isAck").equal(true);
                    receivedAck.should.have.property("isCorrupted").equal(false);
                    // The sender should change its state after receiving the correct acknowledgment
                    sender.should.have.property("currentSeqNum").equal(1);
                    sender.should.have.property("isWaitingAck").equal(false);
                    done();
                }, 2100);
            });

            it("should ignore packets with the wrong acknowledged sequence", function(done){
                this.timeout(2200);
                // Configure the acknowledgment and send a packet
                ack.ackNum = 1;
                sender.send();
                setTimeout(() => {
                    // We make sure the received packet had the wrong acknowledged sequence (1)
                    receivedAck.should.have.property("ackNum").equal(1);
                    // The sender should still be waiting for an acknowledgment
                    sender.should.have.property("currentSeqNum").equal(0);
                    sender.should.have.property("isWaitingAck").equal(true);
                    done();
                }, 2100);
            });

            it("should ignore packets that are corrupted", function(done){
                this.timeout(2200);
                // Configure the acknowledgment and send a packet
                ack.ackNum = 0;
                ack.getCorrupted();
                sender.send();
                setTimeout(() => {
                    // We make sure the received packet is currupted
                    receivedAck.should.have.property("isCorrupted").equal(true);
                    // The sender should still be waiting for an acknowledgment
                    sender.should.have.property("currentSeqNum").equal(0);
                    sender.should.have.property("isWaitingAck").equal(true);
                    done();
                }, 2100);
            });
        });
    });
    
    describe("SWReceiver", function(){
    
        describe("#receive()", function(){
            let sender,
            receiver,
            channel,
            packet,
            receivedAck,
            receivedPacket;

            beforeEach(function(){
                sender = new Node();
                sender.onReceive = packet => {
                    receivedAck = packet;
                };
                receiver = new SWReceiver();
                receiver.onReceive = packet => {
                    receivedPacket = packet;
                };
                channel = new Channel({delay: 1000});
                // The tests will further configure the packet
                packet = new Packet({
                    sender,
                    receiver
                })
                receivedAck = null;
                receivedPacket = null;
            });

            it("should receive a packet and send back an acknowledgment", function(done){
                this.timeout(1200);
                // We send the expected sequence number
                packet.seqNum = 0;
                receiver.should.have.property("expectedSeqNum").equal(0);
                receiver.receive(packet, channel);
                receiver.should.have.property("expectedSeqNum").equal(1);
                setTimeout(() => {
                    // Packet received by the receiver
                    receivedPacket.should.equal(packet);
                    receivedPacket.should.have.property("seqNum").equal(0);
                    // Acknowledgment received by the sender
                    receivedAck.should.have.property("isAck").equal(true);
                    receivedAck.should.have.property("ackNum").equal(0);
                    done();
                }, 1100);
            });

            it("should acknowledge the previous sequence when packets with the wrong expected one arrive", function(done){
                this.timeout(1200);
                // We send the wrong sequence number
                packet.seqNum = 1;
                // The receiver should not change its state
                receiver.should.have.property("expectedSeqNum").equal(0);
                receiver.receive(packet, channel);
                receiver.should.have.property("expectedSeqNum").equal(0);
                setTimeout(() => {
                    receivedPacket.should.equal(packet);
                    receivedPacket.should.have.property("seqNum").equal(1);
                    // We expect the receiver to send an acknowledgment for the previous sequence (1)
                    receivedAck.should.have.property("isAck").equal(true);
                    receivedAck.should.have.property("ackNum").equal(1);
                    done();
                }, 1100);
            });

            it("should acknowledge the previous sequence when corrupted packets arrive", function(done){
                this.timeout(1200);
                // We send the correct sequence, but damage the packet
                packet.seqNum = 0;
                packet.getCorrupted();
                // The receiver should not change its state
                receiver.should.have.property("expectedSeqNum").equal(0);
                receiver.receive(packet, channel);
                receiver.should.have.property("expectedSeqNum").equal(0);
                setTimeout(() => {
                    receivedPacket.should.equal(packet);
                    receivedPacket.should.have.property("seqNum").equal(0);
                    receivedPacket.should.have.property("isCorrupted").equal(true);
                    // We expect the receiver to send an acknowledgment for the previous sequence (1)
                    receivedAck.should.have.property("isAck").equal(true);
                    receivedAck.should.have.property("ackNum").equal(1);
                    done();
                }, 1100);
            });
        });
    
    });

    context("Use SWSender and SWReceiver together", function(){
        const receiver = new SWReceiver();
        // We will manually lose and damage packets
        const channel = new Channel({delay: 1000});
        const sender = new SWSender({
            receiver,
            channel,
            timeout: 2100 // A bit more than twice the round trip time
        });
        const sentPackets = [];
        const sentAcks = [];
        const okPackets = [];
        const notOkPackets = [];
        const receivedAcks = [];
        receiver.onReceive = (packet, channel, isOk) => {
            if (isOk) okPackets.push(packet);
            else notOkPackets.push(packet);
        };
        receiver.onSend = packet => {
            sentAcks.push(packet);
        };
        sender.onReceive = packet => {
            receivedAcks.push(packet);
        };
        sender.onSend = packet => {
            sentPackets.push(packet);
        };

        specify("they should be able to interchange packets through an unreliable channel", function(done){
            this.timeout(6500);
            // We will lose the first packet and damage the
            // first acknowledgment
            sender.send();
            channel.losePacket(sentPackets[0]);
            setTimeout(() => {
                // A re-sent sequence should have arrived around 3100 ms
                // We damage the response
                channel.damagePacket(sentAcks[0]);
            }, 3200);
            setTimeout(() => {
                // The sender should have re-sent sequence 0 for a second
                // time, then the receiver should have responded with
                // an acknowledgment, and this should have arrived around 6200 ms
                sender.should.have.property("isWaitingAck").equal(false);
                sender.should.have.property("currentSeqNum").equal(1);
                sender.should.have.property("_currentTimeout").equal(null);
                receiver.should.have.property("expectedSeqNum").equal(1);
                sentPackets.should.have.lengthOf(3); // The first packet and 2 from timeouts
                receivedAcks.should.have.lengthOf(2); // The damaged one and the last ok one
                receivedAcks[0].isCorrupted.should.be.true;
                okPackets.should.have.lengthOf(1); // The one sent because of the first timeout
                notOkPackets.should.have.lengthOf(1); // The duplicated one from the second timeout
                done();
            }, 6300);
        });

    });
});

