import Channel from "../src/Channel.js";
import {
    GBNSender,
    GBNReceiver
} from "../src/goBackN.js";
import Node from "../src/Node.js";
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
                receiver = new Node();
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
                    receivedPackets.should.have.lengthOf(4);
                    receivedAcks.should.have.lengthOf(4);
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
        });

        describe("#receive()", function(){
            const channel = new Channel({delay: 1000});
            const receiver = new Node();
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
                }), channel);
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

            it("should receive packets and send back acknowledgments");

            it("should drop packets that arrive out of order and send the previous acknowledgment");
        });
    });

    context("Use GBNSender and GBNReceiver together", function(){

        specify("they should be able to interchange packets through an unreliable channel");
    });
});