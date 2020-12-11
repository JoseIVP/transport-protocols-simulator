import Channel from "../src/Channel.js";
import {
    GBNSender,
    GBNReceiver
} from "../src/goBackN.js";
import SimpleReceiver from "../src/SimpleReceiver.js";
import Packet from "../src/Packet.js";


describe("goBackN.js", function(){

    describe("GBNSender", function(){

        describe("#send()", function(){
            let channel,
            receiver,
            sender,
            receivedPackets,
            receivedAcks,
            sentPacket,
            acklist; // Each test should generate it 

            beforeEach(function(){
                channel = new Channel({delay: 1000});
                receiver = new SimpleReceiver();
                let i = 0;
                receiver.onReceive = packet => {
                    receivedPackets.push(packet);
                    channel.send(acklist[i]);
                    i++;
                };
                sender = new GBNSender({
                    receiver,
                    channel,
                    windowSize: 4,
                    timeout: 2100
                })
                sender.onReceive = packet => {
                    receivedAcks.push(packet);
                };
                sender.onSend = packet => {
                    sentPacket = packet;
                };
                receivedPackets = [];
                receivedAcks = [];
                sentPacket = null;
            });

            it("should be able to pipeline N packets", function(done){
                this.timeout(2500);
                acklist = [];
                for(let i=0; i<4; i++)
                    acklist.push(new Packet({
                        receiver: sender,
                        isAck: true,
                        ackNum: i
                    }));
                for(let i=0; i<4; i++)
                    sender.send();
                setTimeout(() => {
                    receivedPackets.should.have.lengthOf(4, "receivedPackets has the wrong length");
                    receivedAcks.should.have.lengthOf(4, "receivedAcks has the wrong length");
                    for(let i=0; i<4; i++){
                        receivedPackets[i].should.have.property("seqNum").equal(i);
                        receivedAcks[i].should.have.property("ackNum").equal(i);
                    }
                    done();
                }, 2200);
            });

            it("should resend the window when the timeout occurs", function(done){
                this.timeout(6500);
                acklist = [];
                for(let i=0; i<6; i++)
                    acklist.push(new Packet({
                        receiver: sender,
                        isAck: true,
                        // ackNums will be 0, 0, 0, 1, 2, 3
                        ackNum: i < 3 ? 0 : i - 2
                    }));
                // We send 4 packets and lose the second one,
                // this should make the sender move base to 1,
                // and therefore resend sequences 1, 2 and 3.
                sender.send();
                sender.send();
                channel.losePacket(sentPacket);
                sender.send();
                sender.send();
                setTimeout(() => {
                    receivedPackets.should.have.lengthOf(6);
                    receivedAcks.should.have.lengthOf(6);
                    // We test that the received acks are in the correct order
                    for(let i=0; i<3; i++){
                        receivedAcks[i].should.have.property("ackNum").equal(0);
                        receivedAcks[3+i].should.have.property("ackNum").equal(i+1);
                    }
                    done();
                }, 6200);
            });

            it("should return true if it sent a packet and false if not (because the window is full)", function(done){
                this.timeout(4300);
                acklist = [];
                for(let i=0; i<5; i++)
                    acklist.push(new Packet({
                        receiver: sender,
                        isAck: true,
                        ackNum: i
                    }));
                // We will try to send 5 packets, one immediately after the
                // the other. And because the window has size 4, the sender
                // should not send the fifth one.
                const expectedPattern = [true, true, true, true, false];
                for(let i=0; i<5; i++){
                    sender.send().should.equal(expectedPattern[i]);
                }
                setTimeout(() => {
                    // Only 4 packets should have been sent
                    receivedPackets.should.have.lengthOf(4);
                    receivedAcks.should.have.lengthOf(4);
                    // We should now be able to send a new packet
                    sender.send().should.equal(true);
                }, 2100);
                setTimeout(() => {
                    // Now the fifth packet should have arrived
                    receivedPackets.should.have.lengthOf(5);
                    receivedAcks.should.have.lengthOf(5);
                    done();
                }, 4200);
            });
        });

        describe("#receive()", function(){
            const channel = new Channel({delay: 1000});
            const receiver = new SimpleReceiver();
            const sender = new GBNSender({
                receiver,
                channel,
                windowSize: 3,
                timeout: 2100
            });
            const receivedAcks = [];
            sender.onReceive = packet => {
                receivedAcks.push(packet);
            };

            it("should be able to receive cumulative acknowledgments", function(){
                // We send three packets and receive only one
                // acknowledgment for the last one.
                sender.send();
                sender.send();
                sender.send();
                sender.receive(new Packet({
                    isAck: true,
                    ackNum: 2
                }));
                receivedAcks.should.have.lengthOf(1);
                sender.should.have.property("base").equal(3);
                sender.should.have.property("nextSeqNum").equal(3);
                // Prevent timeouts
                channel.stop();
            });
        });

    });

    describe("GBNReceiver", function(){

        describe("#receive()", function(){
            let channel,
            sender,
            receiver,
            receivedAcks,
            receivedPackets;

            beforeEach(function(){
                channel = new Channel({delay: 1000});
                sender = new SimpleReceiver();
                receiver = new GBNReceiver({
                    channel,
                    windowSize: 2
                });
                sender.onReceive = packet => {
                    receivedAcks.push(packet);
                };
                receiver.onReceive = packet => {
                    receivedPackets.push(packet);
                };
                receivedAcks = [];
                receivedPackets = [];
            });

            it("should receive packets and send back acknowledgments", function(done){
                this.timeout(1500);
                receiver.should.have.property("expectedSeqNum").equal(0);
                receiver.receive(new Packet({
                    sender,
                    receiver,
                    seqNum: 0
                }));
                setTimeout(() => {
                    receivedPackets.should.have.lengthOf(1);
                    receivedAcks.should.have.lengthOf(1);
                    receivedAcks[0].should.have.property("isAck").equal(true);
                    receivedAcks[0].should.have.property("ackNum").equal(0);
                    done();
                }, 1100);
            });

            it("should drop packets that arrive out of order and send the previous acknowledgment", function(done){
                this.timeout(1500);
                // We send sequence 1 and the receiver should respond
                // with sequence 3.
                receiver.receive(new Packet({
                    sender,
                    receiver,
                    seqNum: 1
                }));
                setTimeout(() => {
                    receivedPackets.should.have.lengthOf(1);
                    receivedAcks.should.have.lengthOf(1);
                    receivedAcks[0].should.have.property("isAck").equal(true);
                    receivedAcks[0].should.have.property("ackNum").equal(3);
                    done();
                }, 1100);
            });
        });
    });

    context("Use GBNSender and GBNReceiver together", function(){
        const channel = new Channel({delay: 1000});
        const windowSize = 4;
        const receiver = new GBNReceiver({
            channel,
            windowSize
        });
        const sender = new GBNSender({
            receiver,
            channel,
            timeout: 2100,
            windowSize
        })
        const receivedPackets = [];
        const receivedAcks = [];
        let lastSentPacket = null;
        receiver.onReceive = packet => {
            receivedPackets.push(packet);
        };
        let damage = true;
        receiver.onSend = packet => {
            // We will only damage the first acknowledgement
            // for sequence number 1
            if(packet.ackNum == 1 && damage){
                packet.damage();
                damage = false;
            }
        };
        sender.onReceive = packet => {
            receivedAcks.push(packet);
        };
        sender.onSend = packet => {
            lastSentPacket = packet;
        };

        specify("they should be able to interchange packets through an unreliable channel", function(done){
            this.timeout(6500);
            // We will send 4 packets, of which the third will be lost, and their
            // sequence numbers should be 0, 1, 2 (lost) and 3. Then the receiver
            // will respond with 3 acknowledgments, of which the second will be damaged,
            // sending sequences 0, 1 (corrupted) and 1 (response to 3, which was out of order).
            // Finally, the sender timeout should occur, resending sequences 2 and 3, and
            // the receiver should respond with acknowledgments 2 and 3.
            sender.send();
            sender.send();
            sender.send();
            channel.losePacket(lastSentPacket);
            sender.send();
            setTimeout(() => {
                receivedPackets.should.have.lengthOf(5);
                receivedAcks.should.have.lengthOf(5);
                const expectedPackets = [0, 1, 3, 2, 3];
                const expectedAcks = [0, 1, 1, 2, 3];
                for(let i=0; i<5; i++){
                    receivedPackets[i].should.have.property("seqNum").equal(expectedPackets[i]);
                    receivedAcks[i].should.have.property("ackNum").equal(expectedAcks[i]);
                    if(i == 1)
                        receivedAcks[i].should.have.property("isCorrupted").equal(true);
                    else
                        receivedAcks[i].should.have.property("isCorrupted").equal(false);
                }
                done();
            }, 6200);
        });
    });
});