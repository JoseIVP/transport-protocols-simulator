import Channel from "../src/Channel.js";
import {
    SRSender,
    SRReceiver,
} from "../src/selectiveRepeat.js";
import Node from "../src/Node.js";
import Packet from "../src/Packet.js";

describe("selectiveRepeat.js", function(){

    describe("SRSender", function(){

        describe("#stop()", function(){
            const channel = new Channel({delay: 1000});
            const receiver = new Node();
            const sentPackets = [];
            const sender = new SRSender({
                channel,
                receiver,
                timeout: 2100,
                windowSize: 2
            });
            sender.onSend = packet => {
                sentPackets.push(packet);
            };

            it("should prevent/stop all current timeouts", function(done){
                this.timeout(2500);
                // We will send two packets and then stop the sender,
                // this should cause only two packets to be sent
                sender.send();
                sender.send();
                sender.stop();
                setTimeout(() => {
                    // The timeout should have passed if it was active (but it shouldn't)
                    sentPackets.should.have.lengthOf(2);
                    done();
                }, 2300);
            })
        });

        describe("#send()", function(){
            let channel,
            receiver,
            sender,
            receivedPackets,
            sentPackets;

            beforeEach(function(){
                receivedPackets = [];
                sentPackets = [];
                channel = new Channel({delay: 1000});
                receiver = new Node();
                receiver.onReceive = packet => {
                    receivedPackets.push(packet);
                };
                sender = new SRSender({
                    channel,
                    receiver,
                    timeout: 2100,
                    windowSize: 3
                });
                sender.onSend = packet => {
                    sentPackets.push(packet);
                };
            });

            it("should be able to pipeline N packets (the size of the window)", function(done){
                // The size of the window is 3, therefore we send 3 packets
                sender.send();
                sender.send();
                sender.send();
                setTimeout(() => {
                    sentPackets.should.have.lengthOf(3);
                    receivedPackets.should.have.lengthOf(3);
                    for(let i=0; i<3; i++){
                        sentPackets[i].should.have.property("seqNum").equal(i);
                        receivedPackets[i].should.equal(sentPackets[i]);
                    }
                    // Prevent timeouts from occurring
                    sender.stop();
                    done();
                }, 1100);
            });

            it("should return true if the packet could be sent and false if it couldn't (full window)", function(done){
                // The size of the window is 3, thus if we send a fourth packet
                // immediately after the third, send() should return false.
                const expectedPattern = [true, true, true, false];
                for(let i=0; i<4; i++)
                    sender.send().should.equal(expectedPattern[i]);
                setTimeout(() => {
                    sentPackets.should.have.lengthOf(3);
                    receivedPackets.should.have.lengthOf(3);
                    for(let i=0; i<3; i++){
                        sentPackets[i].should.have.property("seqNum").equal(i);
                        receivedPackets[i].should.equal(sentPackets[i]);
                    }
                    // Prevent timeouts
                    sender.stop();
                    done();
                }, 1100);
            });

            it("should set individual timeouts for each packet", function(done){
                this.timeout(3500);
                // We will send 2 packets at different times, and their
                // timeouts should therefore be triggered at different times.
                sender.send();
                setTimeout(() => {
                    // We send the second packet
                    sender.send();
                }, 1000);
                setTimeout(() => {
                    // At this point the first timeout should have occurred
                    // and the sender should have sent 3 packets in total
                    sentPackets.should.have.lengthOf(3);
                    sentPackets[0].seqNum.should.equal(0); // The first packet
                    sentPackets[1].seqNum.should.equal(1); // The second one
                    sentPackets[2].seqNum.should.equal(0); // The timeout one
                }, 2200);
                setTimeout(() => {
                    // The second timeout should have passed and the sender
                    // should have re-sent the sencond sequence
                    sentPackets.should.have.lengthOf(4);
                    sentPackets[3].seqNum.should.equal(1);
                    // Prevent future timeouts
                    sender.stop();
                    done();
                }, 3200);
            });

        });

        describe("#receive()", function(){
            let channel,
            receiver,
            sender,
            receivedOkAcks,
            receivedNotOkAcks,
            sentPackets,
            acksToSend;

            beforeEach(function(){
                channel = new Channel({delay: 1000});
                receiver = new Node();
                sender = new SRSender({
                    channel,
                    receiver,
                    windowSize: 3,
                    timeout: 2100
                });
                receivedOkAcks = [];
                receivedNotOkAcks = [];
                sentPackets = [];
                acksToSend = [];
                sender.onSend = packet => {
                    sentPackets.push(packet);
                };
                sender.onReceive = (packet, channel, isOk) => {
                    if(isOk) receivedOkAcks.push(packet);
                    else receivedNotOkAcks.push(packet);
                }
                let i = 0;
                receiver.onReceive = () => {
                    channel.send(acksToSend[i]);
                    i++;
                };
            });

            it("should unset the timeouts for correctly received acknowledgments", function(done){
                this.timeout(2500);
                // We will send 3 packets and only correctly acknowledge the second.
                // The sender should then resend sequence numbers 0 and 2, and should
                // have unset the timeout for sequence number 1.
                acksToSend.push(new Packet({
                    isAck: true,
                    receiver: sender,
                    ackNum: 0
                }));
                acksToSend[0].getCorrupted();
                acksToSend.push(new Packet({
                    isAck: true,
                    receiver: sender,
                    ackNum: 1
                }));
                acksToSend.push(new Packet({
                    isAck: true,
                    receiver: sender,
                    ackNum: 1
                }));
                sender.send();
                sender.send();
                sender.send();
                setTimeout(() => {
                    // At 2200 ms the timeouts for 0 and 2 should have occurred
                    // (not for 1), and the packets should have been re-sent
                    try{
                        sentPackets.should.have.lengthOf(5);
                        const expectedSeqNums = [0, 1, 2, 0, 2];
                        expectedSeqNums.forEach((seqNum, i) => {
                            sentPackets[i].should.have.property("seqNum").equal(seqNum);
                        })
                        receivedOkAcks.should.have.lengthOf(1);
                        receivedOkAcks[0].should.equal(acksToSend[1]);
                        receivedNotOkAcks.should.have.lengthOf(2);
                        receivedNotOkAcks[0].should.equal(acksToSend[0]);
                        receivedNotOkAcks[1].should.equal(acksToSend[2]);
                    }finally{
                        // Stop traveling packets
                        channel.stop();
                        // Stop future timeouts
                        sender.stop();
                    }
                    done();
                }, 2200);
            })

            it("should move the window when the oldest packet is acknowledged", function(done){
                this.timeout(2500);
                // We will try to send 4 packets, and as the window size is 3
                // the fourth one should not be sent. Then we will correctly
                // acknowledge the first and the third expecting the base
                // sequence number of the window to become 1, and expecting
                // to be able to send the fourth packet.
                const ackSequences = [0, 0, 2]
                ackSequences.forEach(ackNum => {
                    acksToSend.push(new Packet({
                        isAck: true,
                        receiver: sender,
                        ackNum
                    }));
                });
                sender.should.have.property("base").equal(0);
                sender.send();
                sender.send();
                sender.send();
                // Trying to send the fourth packet and failing:
                sender.send().should.be.false;
                setTimeout(() => {
                    // At 2200 ms the sender should have sent the
                    // first 3 packets and re-sent the second.
                    try{
                        sentPackets.should.have.lengthOf(4);
                        receivedOkAcks.should.have.lengthOf(2);
                        receivedNotOkAcks.should.have.lengthOf(1);
                        sender.should.have.property("base").equal(1);
                        // Now we can send the fourth
                        sender.send().should.be.true;
                        sentPackets.should.have.lengthOf(5);
                    }finally{
                        // Stop traveling packets
                        channel.stop();
                        // Prevent timeouts
                        sender.stop();
                    }
                    done();
                }, 2200);
            });
        });
    });

    describe("SRReceiver", function(){

        describe("#receive()", function(){
            let channel,
            receiver,
            sender,
            sentAcks,
            receivedAcks,
            receivedOkPackets,
            receivedNotOkPackets;

            beforeEach(function(){
                channel = new Channel({delay: 1000});
                sender = new Node();
                receiver = new SRReceiver({
                    windowSize: 3
                });
                sentAcks = [];
                receivedOkPackets = [];
                receivedNotOkPackets = [];
                receiver.onReceive = (packet, channel, isOk) => {
                    if(isOk) receivedOkPackets.push(packet);
                    else receivedNotOkPackets.push(packet);
                };
                receiver.onSend = packet => {
                    sentAcks.push(packet);
                };
                receivedAcks = [];
                sender.onReceive = packet => {
                    receivedAcks.push(packet);
                }
            });

            it("should send back an acknowledgement for each correctly received packet (packets in the window)", function(done){
                this.timeout(2100);
                // The receiver will receive 3 packets, therefore we expect it to
                // send back 3 acknowledgments
                for(let i=0; i<3; i++)
                    receiver.receive(new Packet({
                        sender,
                        receiver,
                        seqNum: i
                    }), channel);
                setTimeout(() => {
                    receivedOkPackets.should.have.lengthOf(3);
                    receivedNotOkPackets.should.have.lengthOf(0);
                    sentAcks.should.have.lengthOf(3);
                    receivedAcks.should.have.lengthOf(3);
                    receivedAcks.forEach((ack, i) => {
                        ack.should.have.property("isAck").equal(true);
                        ack.should.have.property("ackNum").equal(i);
                    });
                    done();
                }, 2000);
            })
            
            it("should ignore packets that are corrupted or are newer than the current window", function(done){
                // The receiver will receive 3 packets, the first
                // will be corrupted, the second will be ok and the third
                // will have a sequence number greater than the maximum
                // sequence of the window
                const firstPacket = new Packet({
                    sender,
                    receiver,
                    seqNum: 0
                });
                firstPacket.getCorrupted();
                receiver.receive(firstPacket, channel);
                receiver.receive(new Packet({
                    sender,
                    receiver,
                    seqNum: 1
                }), channel);
                receiver.receive(new Packet({
                    sender,
                    receiver,
                    seqNum: 3 // The maximum sequence is 2
                }), channel);
                setTimeout(() => {
                    receivedOkPackets.should.have.lengthOf(1);
                    receivedOkPackets[0].should.have.property("seqNum").equal(1)
                    receivedNotOkPackets.should.have.lengthOf(2);
                    sentAcks.should.have.lengthOf(1);
                    receivedAcks.should.have.lengthOf(1);
                    receivedAcks[0].should.have.property("ackNum").equal(1);
                    done();
                }, 1100);
            });

            it("should move the window when the oldest expected packet is received", function(){
                receiver.should.have.property("base").equal(0);
                receiver.receive(new Packet({
                    sender,
                    receiver,
                    seqNum: 0
                }), channel);
                receiver.should.have.property("base").equal(1);
                // Stop the traveling packet
                channel.stop();
            });

            it("should acknowledge packets older than the current window", function(done){
                // We will send the first sequence number twice. The first packet
                // should make the receiver move its window, thus making sequence
                // number 0 older than the window, but it should acknowledge it anyways.
                receiver.receive(new Packet({
                    sender,
                    receiver,
                    seqNum: 0
                }), channel);
                receiver.receive(new Packet({
                    sender,
                    receiver,
                    seqNum: 0
                }), channel);
                setTimeout(() => {
                    receivedOkPackets.should.have.lengthOf(1)
                    receivedNotOkPackets.should.have.lengthOf(1);
                    sentAcks.should.have.lengthOf(2);
                    receivedAcks.should.have.lengthOf(2);
                    done();
                }, 1100);
            });
        });
    });

    context("Use SRSender and SRReceiver together", function(){
        const windowSize = 3;
        const channel = new Channel({delay: 1000});
        const receiver = new SRReceiver({windowSize});
        const sender = new SRSender({
            channel,
            receiver,
            windowSize,
            timeout: 2100
        });
        const receivedOkAcks = [];
        const receivedNotOkAcks = [];
        const receivedOkPackets = [];
        const receivedNotOkPackets = [];
        const sentPackets = [];
        const sentAcks = [];
        sender.onSend = packet => {
            sentPackets.push(packet);
        };
        sender.onReceive = (packet, channel, isOk) => {
            if(isOk) receivedOkAcks.push(packet);
            else receivedNotOkAcks.push(packet);
        };
        receiver.onSend = packet => {
            sentAcks.push(packet);
        };
        receiver.onReceive = (packet, channel, isOk) => {
            if(isOk) receivedOkPackets.push(packet);
            else receivedNotOkPackets.push(packet);
        };

        specify("they should be a able to interchange packets through an unreliable channel", function(done){
            this.timeout(4500);
            // We will try to send the 3 packets of the window, losing the first,
            // damaging the second and losing the acknowledgment of the third.
            sender.send();
            sentPackets.should.have.lengthOf(1);
            channel.losePacket(sentPackets[0]);
            sender.send();
            sentPackets.should.have.lengthOf(2);
            channel.damagePacket(sentPackets[1]);
            sender.send();
            setTimeout(() => {
                // At this point the third packet should have arrived
                receivedOkPackets.should.have.lengthOf(1);
                receivedOkPackets[0].should.have.property("seqNum").equal(2);
                sentAcks.should.have.lengthOf(1);
                sentAcks[0].should.have.property("ackNum").equal(2);
                // We damage the acknowledgment of the third packet
                channel.losePacket(sentAcks[0]);
            }, 1100);
            setTimeout(() => {
                // Arround 4100 ms all the acknowledgments should
                // have arrived and the interchange should be complete
                receivedOkPackets.should.have.lengthOf(3);
                receivedNotOkPackets.should.have.lengthOf(2);
                receivedOkAcks.should.have.lengthOf(3);
                receivedNotOkAcks.should.have.lengthOf(0);
                sentPackets.should.have.lengthOf(6);
                sentAcks.should.have.lengthOf(4);
                receiver.base.should.equal(3);
                sender.base.should.equal(3);
                done();
            }, 4300);
        });
    });
});