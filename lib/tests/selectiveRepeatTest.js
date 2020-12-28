import Channel from "../src/Channel.js";
import {
    SRSender,
    SRReceiver,
} from "../src/selectiveRepeat.js";
import SimpleReceiver from "../src/SimpleReceiver.js";
import Packet from "../src/Packet.js";
import { sleep } from "../src/utils.js";

describe("selectiveRepeat.js", function(){

    describe("SRSender", function(){

        describe("#stop()", function(){
            const delay = 100;
            const timeout = 220;
            const channel = new Channel({delay});
            const receiver = new SimpleReceiver();
            const sender = new SRSender({
                channel,
                receiver,
                timeout,
                windowSize: 2
            });
            const receivedPkts = [];
            receiver.onReceive = pkt => receivedPkts.push(pkt);

            it("should prevent/stop all current timeouts", async function(){
                // We will send two packets and then stop the sender, this
                // should cause only two packets to be sent
                sender.send();
                sender.send();
                sender.stop();
                await sleep(timeout + delay + 50);
                receivedPkts.should.have.lengthOf(2);
            })
        });

        describe("#send()", function(){
            const delay = 100;
            const timeout = 220;
            const windowSize = 3;
            let channel,
            receiver,
            sender,
            receivedPkts;

            beforeEach(function(){
                channel = new Channel({delay});
                receiver = new SimpleReceiver();
                receivedPkts = [];
                receiver.onReceive = pkt => receivedPkts.push(pkt);
                sender = new SRSender({
                    channel,
                    receiver,
                    timeout,
                    windowSize
                });
            });

            afterEach(function(){
                sender.stop();
                channel.stop();
            });

            it(`should be able to pipeline as many packets as the size of the window`, async function(){
                sender.should.have.property("base").equal(0);
                sender.should.have.property("nextSeqNum").equal(0);
                for(let i=0; i<windowSize; i++){
                    sender.send().should.be.true;
                    sender.should.have.property("nextSeqNum").equal(i+1)
                }
                sender.should.have.property("base").equal(0);
                // Should return false when the window is full
                sender.send().should.be.false;
                await sleep(delay);
                receivedPkts.should.have.lengthOf(windowSize);
                receivedPkts.forEach((pkt, i) => {
                    pkt.should.eql(new Packet({
                        sender,
                        receiver,
                        seqNum: i
                    }));
                });
            });

            it("should fire onTimeoutSet() every time a packet is sent or re-sent", async function(){
                const sequences = [];
                sender.onTimeoutSet = seqNum => sequences.push(seqNum);
                sender.send();
                sender.send();
                sequences.should.eql([0, 1]);
                await sleep(timeout);
                // Sequences should have been re-sent
                sequences.should.eql([0, 1, 0, 1]);
            });

            it("should resend each sequence when its timeout occurs", async function(){
                // We will send two packets with a delay between them, then
                // their timeouts should also occur with the same delay between
                sender.send();
                const timeToNextPkt = 50; // Time to wait for sending next packet
                await sleep(timeToNextPkt);
                sender.send();
                // Wait for the timeout to ocurr and the packet to arrive at the
                // receiver
                const error = 5 // We leave 5 ms of error for the packets to arrive
                await sleep(timeout + delay - timeToNextPkt + error);
                receivedPkts.should.have.lengthOf(3);
                await sleep(timeToNextPkt + error);
                receivedPkts.should.have.lengthOf(4);
            });

            it("should call onSend() every time a packet is sent or re-sent", async function(){
                const sentPkts = [];
                sender.onSend = pkt => sentPkts.push(pkt);
                sender.send();
                sentPkts.should.have.lengthOf(1);
                const config = {
                    sender, 
                    receiver,
                    seqNum: 0
                };
                sentPkts[0].should.eql(new Packet(config));
                // Wait for the packet to be re-sent
                await sleep(timeout);
                sentPkts.should.have.lengthOf(2);
                sentPkts[1].should.eql(new Packet({
                    ...config,
                    wasReSent: true
                }));
            });

        });

        describe("#receive()", function(){
            const delay = 100;
            const timeout = 220;
            const windowSize = 3;
            let channel,
            receiver,
            sender;

            beforeEach(function(){
                channel = new Channel({delay});
                receiver = new SimpleReceiver();
                sender = new SRSender({
                    channel,
                    receiver,
                    timeout,
                    windowSize
                });
            });

            afterEach(function(){
                sender.stop();
                channel.stop();
            });

            function makeAck(ackNum){
                return new Packet({
                    sender: receiver,
                    receiver: sender,
                    isAck: true,
                    ackNum
                });
            }

            // Test for onTimeoutSet() and onPktConfirmed()
            function confirmTest(callBackName){
                const sequences = [];
                sender[callBackName] = seqNum => sequences.push(seqNum);
                // Receive incorrect packet
                sender.receive(makeAck(0));
                sequences.should.have.lengthOf(0);
                sender.send();
                // Receive correct packet
                sender.receive(makeAck(0));
                sequences.should.eql([0]);
                // Send 3 and confirm the second
                for(let i=0; i<3; i++)
                    sender.send();
                sender.receive(makeAck(2));
                sequences.should.eql([0, 2]);
            }

            it("should call onTimeoutUnset() for each correctly confirmed sequence", function(){
                confirmTest("onTimeoutUnset");
            });

            it("should fire onPktConfirmed() for each confirmed sequence", function(){
                confirmTest("onPktConfirmed");
            });

            it("should fire onReceive() for each received packet", function(){
                const receivedAcks = [];
                let ackOk = null;
                sender.onReceive = (pkt, isOk) => {
                    receivedAcks.push(pkt);
                    ackOk = isOk;
                };
                const ack1 = makeAck(0);
                // Receive incorrect ack
                sender.receive(ack1);
                receivedAcks.should.eql([ack1]);
                ackOk.should.be.false;
                sender.send();
                const ack2 = makeAck(0);
                // Receive correct ack
                sender.receive(ack2);
                receivedAcks.should.eql([ack1, ack2]);
                ackOk.should.be.true;
            });
        
            it("should call onWindowMoved() each time the base sequence is confirmed", function(){
                const movesList = [];
                sender.onWindowMoved = spaces => movesList.push(spaces);
                sender.should.include({base: 0,nextSeqNum: 0});
                sender.receive(makeAck(0));
                movesList.should.have.lengthOf(0);
                sender.send();
                sender.should.include({base: 0,nextSeqNum: 1});
                sender.receive(makeAck(0));
                movesList.should.eql([1]);
                sender.should.include({base: 1,nextSeqNum: 1});
                // Send the entire window
                for(let i=0; i<windowSize; i++)
                    sender.send();
                // Confirm the second packet
                sender.receive(makeAck(2));
                movesList.should.eql([1]);
                sender.should.include({base: 1,nextSeqNum: 4});
                // Confirm the first packet
                sender.receive(makeAck(1));
                // Now the window should have moved
                movesList.should.eql([1, 2]);
                sender.should.include({base: 3,nextSeqNum: 4});
            });

            it("should ignore corrupted acks and incorrect sequences", function(){
                sender.should.have.property("base").equal(0);
                sender.send();
                // Receive incorrect sequence
                sender.receive(makeAck(3));
                sender.should.have.property("base").equal(0);
                // Receive correct sequence but corrupted packet
                const ack = makeAck(0);
                ack.damage();
                sender.receive(ack);
                sender.should.have.property("base").equal(0);
            });

            it("should confirm all the sequences before and including the received one when the ack is cumulative", function(){
                // Send the entire window
                for(let i=0; i<windowSize; i++)
                    sender.send();
                sender.receive(new Packet({
                    sender: receiver,
                    receiver: sender,
                    isAck: true,
                    isCAck: true,
                    ackNum: windowSize - 1
                }));
                sender.should.have.property("base").equal(windowSize);
            });
        });
    });

    describe("SRReceiver", function(){

        describe("#receive()", function(){
            const delay = 100;
            const windowSize = 3;
            let channel,
            receiver,
            sender,
            receivedAcks;

            beforeEach(function(){
                receivedAcks = [];
                channel = new Channel({delay});
                sender = new SimpleReceiver();
                sender.onReceive = pkt => receivedAcks.push(pkt);
                receiver = new SRReceiver({
                    channel,
                    windowSize
                });
            });

            afterEach(function(){
                channel.stop();
            });

            function makePkt(seqNum) {
                return new Packet({
                    sender,
                    receiver,
                    seqNum
                });
            }

            function makeAck(ackNum) {
                return new Packet({
                    sender: receiver,
                    receiver: sender,
                    isAck: true,
                    ackNum
                });
            }

            it("should send an ack for each correctly received packet", async function(){
                receiver.receive(makePkt(0));
                await sleep(delay);
                receivedAcks.should.eql([makeAck(0)]);
            });

            it("should send an ack for a duplicate packet even if corrupted", async function(){
                receiver.receive(makePkt(0));
                // Send duplicates
                receiver.receive(makePkt(0));
                const pkt = makePkt(0);
                pkt.damage();
                receiver.receive(pkt);
                await sleep(delay);
                const ack = makeAck(0);
                receivedAcks.should.eql([ack, ack, ack]);
            });

            it("should ignore packets that are in the window but are corrupted", async function(){
                // Send correct sequence but damaged packet
                const pkt = makePkt(0);
                pkt.damage();
                receiver.receive(pkt);
                await sleep(delay + 100); // The 100 are to be sure
                receivedAcks.should.have.lengthOf(0);
            });

            it("should fire onReceive() for each received packet", function(){
                const receivedPkts = [];
                let pktOk = null;
                receiver.onReceive = (pkt, isOk) => {
                    receivedPkts.push(pkt);
                    pktOk = isOk;
                };
                // Send a correct packet
                const pkt = makePkt(0);
                receiver.receive(pkt);
                receivedPkts.should.have.lengthOf(1);
                receivedPkts[0].should.equal(pkt);
                pktOk.should.be.true;
                // Send a duplicate packet
                const pkt2 = makePkt(0);
                receiver.receive(pkt2);
                receivedPkts.should.have.lengthOf(2);
                receivedPkts[1].should.equal(pkt2);
                pktOk.should.be.false;
                // Send correct sequence but damaged packet
                const pkt3 = makePkt(1);
                pkt3.damage();
                receiver.receive(pkt3);
                receivedPkts.should.have.lengthOf(3);
                receivedPkts[2].should.equal(pkt3);
                pktOk.should.be.false;
            });

            it("should fire onWindowMoved() each time the base sequence is received", function(){
                const movesList = [];
                receiver.onWindowMoved = spaces => movesList.push(spaces);
                receiver.should.have.property("base").equal(0);
                // Receive the base sequence
                receiver.receive(makePkt(0));
                receiver.should.have.property("base").equal(1);
                movesList.should.eql([1]);
                // Receive the last two sequences and then the base
                receiver.receive(makePkt(2));
                receiver.receive(makePkt(3));
                receiver.receive(makePkt(1));
                receiver.should.have.property("base").equal(4);
                movesList.should.eql([1, 3]);
            });

        });

        context("use receive() with cumulative acks", function(){
            const delay = 100;
            const windowSize = 3;
            let channel,
            receiver,
            sender,
            receivedAcks;

            beforeEach(function(){
                receivedAcks = [];
                channel = new Channel({delay});
                sender = new SimpleReceiver();
                sender.onReceive = pkt => receivedAcks.push(pkt);
                receiver = new SRReceiver({
                    channel,
                    windowSize,
                    useCAck: true
                });
            });

            afterEach(function(){
                channel.stop();
            });

            function makePkt(seqNum) {
                return new Packet({
                    sender,
                    receiver,
                    seqNum
                });
            }

            function makeAck(ackNum, isCAck=false) {
                return new Packet({
                    sender: receiver,
                    receiver: sender,
                    isAck: true,
                    isCAck,
                    ackNum
                });
            }

            it("should send a cumulative ack when the base sequence is received", async function(){
                // A cumulative ack should confirm the sequence before the new
                // base
                receiver.receive(makePkt(0));
                receiver.should.have.property("base").equal(1);
                await sleep(delay);
                receivedAcks.should.eql([makeAck(0, true)]);
                // Receive the 2, 3 and then the base
                receiver.receive(makePkt(2));
                receiver.receive(makePkt(3));
                receiver.receive(makePkt(1));
                receiver.should.have.property("base").equal(4);
                await sleep(delay);
                receivedAcks.should.eql([
                    makeAck(0, true), // Cumulative ack
                    makeAck(2),
                    makeAck(3),
                    makeAck(3, true),  // Cumulative ack
                ]);
            });

            it("should send a cumulative ack for the sequence before the base for corrupted packets", async function(){
                const pkt1 = makePkt(0);
                pkt1.damage();
                receiver.receive(pkt1);
                await sleep(delay);
                receivedAcks.should.eql([makeAck(windowSize * 2 - 1, true)]);
            });

            it("should send a cumulative ack for the sequence before the base for packets older than base", async function(){
                // Move the window
                receiver.receive(makePkt(0));
                receiver.receive(makePkt(1));
                receiver.should.have.property("base").equal(2);
                // Receive older packet (sequence before base)
                receiver.receive(makePkt(0));
                await sleep(delay);
                receivedAcks.should.eql([
                    makeAck(0, true),
                    makeAck(1, true),
                    makeAck(1, true) // The ack for older packet 
                ]);
            })
        });
    });

    context("Use SRSender and SRReceiver together", function(){
        const windowSize = 3;
        const delay = 100;
        const timeout = 220;
        const channel = new Channel({delay});
        const receiver = new SRReceiver({channel, windowSize});
        const sender = new SRSender({
            channel,
            receiver,
            windowSize,
            timeout
        });
        const sentPkts = [];
        sender.onSend = pkt => sentPkts.push(pkt);
        
        afterEach(function(){
            sender.stop();
            channel.stop();
        });

        specify("they should be a able to interchange packets through an unreliable channel", async function(){
            // Send the window, damaging the second and losing the third packet
            for(let i=0; i<windowSize; i++)
                sender.send()
            sentPkts.should.have.lengthOf(3);
            sentPkts[1].damage();
            channel.losePacket(sentPkts[2]);
            await sleep(timeout * 2);
            // Both windows should have moved
            sender.should.have.property("base").equal(3);
            receiver.should.have.property("base").equal(3);
        });
    });
});