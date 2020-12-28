import Channel from "../src/Channel.js";
import {
    SWSender,
    SWReceiver,
} from "../src/stopAndWait.js";
import Packet from "../src/Packet.js";
import SimpleReceiver from "../src/SimpleReceiver.js";
import { sleep } from "../src/utils.js";

describe("stopAndWait.js", function(){
    
    describe("SWSender", function(){
    
        describe("#send()", function(){
            let receiver,
            channel,
            sender,
            receivedPkts,
            sentPkts;
            
            beforeEach(function(){
                receivedPkts = [];
                sentPkts = [];
                receiver = new SimpleReceiver();
                receiver.onReceive = packet => receivedPkts.push(packet);
                channel = new Channel({delay: 250});
                sender = new SWSender({
                    receiver,
                    channel,
                    timeout: 600 // A bit more than the round trip time
                });
                sender.onSend = packet => sentPkts.push(packet);
            });
    
            it(`should send a packet through its channel to its receiver, if
                currently not waiting for an ack, and return true`,
                async function(){
                // This should be the initial state of the sender
                sender.should.have.property("currentSeqNum").equal(0);
                sender.should.have.property("isWaitingAck").equal(false);
                sender.send();
                sentPkts.should.have.lengthOf(1);
                // The sender should have changed its state
                sender.should.have.property("currentSeqNum").equal(0);
                sender.should.have.property("isWaitingAck").equal(true);
                // Prevent it from resending packets
                sender.stop();
                await sleep(250);
                receivedPkts.should.have.lengthOf(1);
                receivedPkts[0].should.have.property("seqNum").equal(0);
            });
            
            it(`should not send a packet when waiting for an ack,
                returning false instead`, function(){
                sender.send().should.be.true;
                sender.should.have.property("isWaitingAck").equal(true);
                sender.send().should.be.false;
                sender.stop();
                channel.stop();
            });

            it(`should resend the sequence when the timeout passes`,
                async function(){
                sender.send();
                await sleep(1250); // 2 timeouts have passed
                // The sender should have sent 3 packets, the original and 2
                // re-sent ones
                sender.stop();
                channel.stop();
                sentPkts.should.have.lengthOf(3);
                for(let i=0; i<3; i++){
                    sentPkts[i].should.not.equal(sentPkts[(i+1)%3]);
                    sentPkts[i].should.have.property("seqNum").equal(0);
                }
            });

            it("should fire onTimeoutSet() each time a packet is sent or re-sent",
                async function(){
                const timeoutsSet = [];
                sender.onTimeoutSet = seqNum => timeoutsSet.push(seqNum);
                sender.send()
                await sleep(1250); // 2 timeout have passed (3 pkts sent)
                sender.stop();
                channel.stop();
                timeoutsSet.should.have.lengthOf(3);
                for(const seq of timeoutsSet)
                    seq.should.equal(0);
            });

            it("should fire onSend() each time a packet is sent or re-sent",
                async function(){
                sender.send()
                await sleep(1250) // 2 timeouts have passed (3 pkts sent)
                sender.stop();
                channel.stop();
                sentPkts.should.have.lengthOf(3);
            });
    
        });
    
        describe("#receive()", function(){
            let receiver,
            channel,
            sender,
            ack,
            receivedAck,
            count;

            beforeEach(function(){
                receiver = new SimpleReceiver();
                channel = new Channel({delay: 250});
                sender = new SWSender({
                    receiver,
                    channel,
                    timeout: 600
                });
                // Each test will further configure the acknowledgment
                ack = new Packet({
                    sender: receiver,
                    receiver: sender,
                    isAck: true
                });
                receivedAck = null;
                count = 0;
                sender.onReceive = packet => {
                    receivedAck = packet;
                    count++;
                };
            });

            it(`should be able to receive an acknowledgment after sending a
                packet`, function(){
                // Configure the ack and send a packet
                ack.ackNum = 0;
                sender.send();
                sender.receive(ack)
                count.should.equal(1);
                receivedAck.should.have.property("ackNum").equal(0);
                receivedAck.should.have.property("isAck").equal(true);
                receivedAck.should.have.property("isCorrupted").equal(false);
                // The sender should change its state after receiving the
                // correct ack
                sender.should.have.property("currentSeqNum").equal(1);
                sender.should.have.property("isWaitingAck").equal(false);
            });

            it("should ignore packets with the wrong acknowledged sequence",
                function(){
                // Configure the ack and send a packet
                ack.ackNum = 1;
                sender.send();
                sender.receive(ack);
                count.should.equal(1);
                // We make sure the received packet had the wrong acknowledged
                // sequence (1)
                receivedAck.should.have.property("ackNum").equal(1);
                // The sender should still be waiting for an ack
                sender.should.have.property("currentSeqNum").equal(0);
                sender.should.have.property("isWaitingAck").equal(true);
            });

            it("should ignore packets that are corrupted", function(){
                // Configure the ack and send a packet
                ack.ackNum = 0;
                ack.damage();
                sender.send();
                sender.receive(ack);
                count.should.equal(1);
                // We make sure the received packet is currupted
                receivedAck.should.have.property("isCorrupted").equal(true);
                // The sender should still be waiting for an acknowledgment
                sender.should.have.property("currentSeqNum").equal(0);
                sender.should.have.property("isWaitingAck").equal(true);
            });

            it("should fire onTimeoutUnset() when a received ack is correct",
                function(){
                const unsetSequences = [];
                sender.onTimeoutUnset = seqNum => unsetSequences.push(seqNum);
                ack.ackNum = 0;
                sender.send();
                sender.receive(ack);
                unsetSequences.should.have.lengthOf(1);
                unsetSequences[0].should.equal(0); 
            });

            it("should fire onPktConfirmed() when a received ack is correct",
                function(){
                const confirmedPkts = [];
                sender.onPktConfirmed = seqNum => confirmedPkts.push(seqNum);
                ack.ackNum = 0;
                sender.send();
                sender.receive(ack);
                confirmedPkts.should.have.lengthOf(1);
                confirmedPkts[0].should.equal(0); 
            });

            it("should fire onReceive() each time a packet is received",
                function(){
                const pktsReceived = [];
                let pktOk = null;
                sender.onReceive = (packet, isOk) => {
                    pktsReceived.push(packet);
                    pktOk = isOk;
                };
                // Receive incorrect packet
                sender.receive(new Packet({isAck: true, ackNum: 0}));
                pktsReceived.should.have.lengthOf(1);
                pktOk.should.be.false;
                sender.send();
                // Receive correct packet
                sender.receive(new Packet({isAck: true, ackNum: 0}));
                pktsReceived.should.have.lengthOf(2);
                pktOk.should.be.true;
                sender.stop();
                channel.stop();
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
                sender = new SimpleReceiver();
                sender.onReceive = packet => {
                    receivedAck = packet;
                };
                channel = new Channel({delay: 250});
                receiver = new SWReceiver({channel});
                receiver.onReceive = packet => {
                    receivedPacket = packet;
                };
                // The tests will further configure the packet
                packet = new Packet({
                    sender,
                    receiver
                })
                receivedAck = null;
                receivedPacket = null;
            });

            it("should fire onReceive() each time a packet is received",
                function(){
                // Only this test is different for onReceive()
                const receivedPkts = [];
                let pktOk = null;
                receiver.onReceive = (packet, isOk) => {
                    receivedPkts.push(packet);
                    pktOk = isOk;
                };
                // Receive incorrect packet
                receiver.receive(new Packet({sender, seqNum: 1}));
                receivedPkts.should.have.lengthOf(1);
                pktOk.should.be.false;
                // Receive correct packet
                receiver.receive(new Packet({sender, seqNum: 0}));
                channel.stop();
                receivedPkts.should.have.lengthOf(2);
                pktOk.should.be.true;
            });

            it("should receive a packet and send back an acknowledgment",
                async function(){
                // We send the expected sequence number
                packet.seqNum = 0;
                receiver.should.have.property("expectedSeqNum").equal(0);
                receiver.receive(packet);
                receiver.should.have.property("expectedSeqNum").equal(1);
                // Packet received by the receiver
                receivedPacket.should.equal(packet);
                receivedPacket.should.have.property("seqNum").equal(0);
                await sleep(250);
                // Acknowledgment received by the sender
                receivedAck.should.have.property("isAck").equal(true);
                receivedAck.should.have.property("ackNum").equal(0);
            });

            it(`should acknowledge the previous sequence when packets with the
                wrong sequence arrive`, async function(){
                // We send the wrong sequence number
                packet.seqNum = 1;
                // The receiver should not change its state
                receiver.should.have.property("expectedSeqNum").equal(0);
                receiver.receive(packet);
                receiver.should.have.property("expectedSeqNum").equal(0);
                receivedPacket.should.equal(packet);
                receivedPacket.should.have.property("seqNum").equal(1);
                await sleep(250);
                // We expect the receiver to send an acknowledgment for the
                // previous sequence (1)
                receivedAck.should.have.property("isAck").equal(true);
                receivedAck.should.have.property("ackNum").equal(1);
            });

            it(`should acknowledge the previous sequence when corrupted packets
                arrive`, async function(){
                // We send the correct sequence, but damage the packet
                packet.seqNum = 0;
                packet.damage();
                // The receiver should not change its state
                receiver.should.have.property("expectedSeqNum").equal(0);
                receiver.receive(packet);
                receiver.should.have.property("expectedSeqNum").equal(0);
                receivedPacket.should.equal(packet);
                receivedPacket.should.have.property("seqNum").equal(0);
                receivedPacket.should.have.property("isCorrupted").equal(true);
                await sleep(250);
                // We expect the receiver to send an acknowledgment for the
                // previous sequence (1)
                receivedAck.should.have.property("isAck").equal(true);
                receivedAck.should.have.property("ackNum").equal(1);
            });
        });
    
    });

    context("Use SWSender and SWReceiver together", function(){
        // We will manually lose and damage packets
        const channel = new Channel({delay: 200});
        const receiver = new SWReceiver({channel});
        const sender = new SWSender({
            receiver,
            channel,
            timeout: 450 // A bit more than twice the round trip time
        });
        const sentPackets = [];
        const sentAcks = [];
        const okPackets = [];
        const notOkPackets = [];
        const receivedAcks = [];
        receiver.onReceive = (packet, isOk) => {
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

        specify(`they should be able to interchange packets through an
            unreliable channel`, async function(){
            // We will lose the first packet and damage the first acknowledgment
            sender.send();
            channel.losePacket(sentPackets[0]);
            await sleep(660);
            // A re-sent sequence should have arrived around 650 ms
            channel.damagePacket(sentAcks[0]); // Damage the response
            await sleep(650); // Total time: 1310
            // The sender should have re-sent sequence 0 for a second time, then
            // the receiver should have responded with an acknowledgment, and
            // this should have arrived around 1300 ms
            sender.should.have.property("isWaitingAck").equal(false);
            sender.should.have.property("currentSeqNum").equal(1);
            receiver.should.have.property("expectedSeqNum").equal(1);
            sentPackets.should.have.lengthOf(3); // The first packet and 2 from timeouts
            receivedAcks.should.have.lengthOf(2); // The damaged one and the last ok one
            receivedAcks[0].isCorrupted.should.be.true;
            okPackets.should.have.lengthOf(1); // The one sent because of the first timeout
            notOkPackets.should.have.lengthOf(1); // The duplicated one from the second timeout
        });

    });
});

