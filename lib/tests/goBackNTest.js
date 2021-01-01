import Channel from "../src/Channel.js";
import {
    GBNSender,
    GBNReceiver
} from "../src/goBackN.js";
import SimpleReceiver from "../src/SimpleReceiver.js";
import Packet from "../src/Packet.js";
import { sleep } from "../src/utils.js";


describe("goBackN.js", function(){

    describe("GBNSender", function(){

        describe("#send()", function(){
            let channel,
            receiver,
            sender,
            receivedPkts;
            const windowSize = 4;
            const delay = 200;
            const timeout = 450;

            beforeEach(function(){
                channel = new Channel({delay});
                receiver = new SimpleReceiver();
                sender = new GBNSender({
                    receiver,
                    timeout,
                    channel,
                    windowSize
                });
                receivedPkts = [];
                receiver.onReceive = packet => receivedPkts.push(packet);
            });

            afterEach(function(){
                // Prevent tiemouts
                sender.stop();
                channel.stop();
            })

            it(`should be able to pipeline as many packets as the size of the
                window`, async function(){
                // send() should return true if a packet could be sent, false
                // otherwise
                for(let i=0; i<windowSize; i++)
                    sender.send().should.be.true;
                // Should not allow to send more packets than the size of the
                // window:    
                sender.send().should.be.false;
                // Wait enough time for packets to arrive at the receiver
                await sleep(delay + 50);
                receivedPkts.should.have.lengthOf(4);
                for(let i=0; i<windowSize; i++){
                    const packet = receivedPkts[i];
                    packet.should.have.property("seqNum").equal(i);
                    packet.should.have.property("receiver").equal(receiver);
                }
            });

            it(`should call onTimeoutSet() every time the base sequence is sent
                or re-sent`, async function(){
                const sequences = [];
                sender.onTimeoutSet = seqNum => sequences.push(seqNum);
                // Try to send one more than the size of the window
                for(let i=0; i<=windowSize; i++)
                    sender.send(); 
                sequences.should.have.lengthOf(1);
                sequences[0].should.equal(0);
                await sleep(timeout); // Wait for the timeout to occur
                sequences.should.have.lengthOf(2);
                sequences.should.have.members([0, 0]);
            });

            it(`should resend all the sent packets from the window when the
                timeout passes`, async function(){
                // Send one less than the size of the window
                const pktsToSend = windowSize - 1
                for(let i=0; i<pktsToSend; i++)
                    sender.send();
                // Wait for the timeout to occur and the re-sent packets to
                // arrive at the receiver.
                await sleep(timeout + delay + 10)
                receivedPkts.should.have.lengthOf(6);
                for(let i=0; i<pktsToSend; i++){
                    receivedPkts[i].should.have.property("seqNum").equal(i);
                    receivedPkts[i+pktsToSend].should.have.property("seqNum").equal(i);
                    receivedPkts[i+pktsToSend].should.have.property("wasReSent").equal(true);
                }
            })

            it("should call onSend() every time a packet is sent",
                async function(){
                const sentPkts = [];
                sender.onSend = packet => sentPkts.push(packet);
                for(let i=0; i<windowSize; i++){
                    sender.send();
                    sentPkts.should.have.lengthOf(i+1);
                }
                // Try to send on more than the size of the window
                sender.send();
                sentPkts.should.have.lengthOf(windowSize);
                await sleep(timeout); // Wait for the tiemout to occur
                sentPkts.should.have.lengthOf(windowSize * 2);
                for(let i=0; i<windowSize; i++){
                    sentPkts[i].should.have.property("seqNum").equal(i);
                    sentPkts[i+windowSize].should.have.property("seqNum").equal(i);
                }
            });            
        });

        describe("#receive()", function(){
            const delay = 200;
            const timeout = 450;
            const windowSize = 3;
            let channel,
            receiver,
            sender;

            beforeEach(function(){
                channel = new Channel({delay});
                receiver = new SimpleReceiver();
                sender = new GBNSender({
                    receiver,
                    channel,
                    windowSize,
                    timeout
                });
            });

            afterEach(function(){
                // Stop timeouts
                sender.stop();
                channel.stop();
            })

            it("should be able to receive cumulative acknowledgments", function(){
                // We send the whole window of packets and receive only one ack
                sender.should.have.property("base").equal(0);
                for(let i=0; i<windowSize; i++)
                    sender.send();
                sender.receive(new Packet({
                    isAck: true,
                    ackNum: 2
                }));
                sender.should.have.property("base").equal(3);
                sender.should.have.property("nextSeqNum").equal(3);
            });

            it("should fire onReceive() each time a packet is received", function(){
                const receivedAcks = [];
                let ackOk = null;
                sender.onReceive = (packet, isOk) => {
                    receivedAcks.push(packet);
                    ackOk = isOk;
                };
                // Receive an akc when expecting none
                const ack1 = new Packet({isAck: true, ackNum: 0});
                sender.receive(ack1);
                receivedAcks.should.have.lengthOf(1);
                receivedAcks[0].should.equal(ack1);
                ackOk.should.be.false;
                sender.send();
                sender.send();
                // Receive an ack for the 2 previous packets
                const ack2 = new Packet({isAck: true, ackNum: 1});
                sender.receive(ack2);
                receivedAcks.should.have.lengthOf(2);
                receivedAcks[1].should.equal(ack2);
                ackOk.should.be.true;
            });

            it(`should fire onTimeoutUnset() each time the base sequence is
                correctly acknowledged`, function(){
                const sequences = [];
                sender.onTimeoutUnset = seqNum => sequences.push(seqNum);
                sender.send()
                // Acknowledge sequence 0
                sender.receive(new Packet({isAck: true, ackNum: 0}));
                sequences.should.have.lengthOf(1);
                sequences[0].should.equal(0);
                sender.send();
                sender.send();
                // Send incorrect ack
                sender.receive(new Packet({isAck: true, ackNum: 0}));
                sequences.should.have.lengthOf(1);
                // Acknowledge sequences 1 and 2
                sender.receive(new Packet({isAck: true, ackNum: 2}));
                sequences.should.have.lengthOf(2);
                sequences[1].should.equal(1);
            });

            it("should fire onPktConfirmed() each time a sequence is confirmed",
                function(){
                const sequences = [];
                const isAck = true;
                sender.onPktConfirmed = seqNum => sequences.push(seqNum);
                sender.send()
                // Confirm sequence 0
                sender.receive(new Packet({isAck, ackNum: 0}));
                sequences.should.have.lengthOf(1);
                sender.send();
                sender.send();
                // Confirm sequences 1 and 2
                sender.receive(new Packet({isAck, ackNum: 2}));
                sequences.should.have.lengthOf(3);
                for(let i=0; i<3; i++)
                    sequences[i].should.equal(i);
            });

            it(`should fire onWindowMoved() each time the base sequence is
                confirmed`, function(){
                const movesList = [];
                const isAck = true;
                sender.onWindowMoved = spacesMoved => movesList.push(spacesMoved);
                sender.send();
                // Send incorrect ack
                sender.receive(new Packet({isAck, ackNum: 2}));
                movesList.should.have.lengthOf(0);
                // Send correct ack
                sender.receive(new Packet({isAck, ackNum: 0}));
                movesList.should.have.lengthOf(1);
                for(let i=0; i<3; i++)
                    sender.send();
                sender.receive(new Packet({isAck, ackNum: 3}));
                movesList.should.have.lengthOf(2);
                movesList.should.have.ordered.members([1, 3]);
            });

            it(`should ignore corruped acks, and acks with sequences different
                from the ones sent in the current window`, function(){
                const isAck = true;
                sender.should.have.property("base").equal(0);
                // Send incorrect sequence
                sender.receive(new Packet({isAck, ackNum: 1}));
                sender.should.have.property("base").equal(0);
                // Send sequences 0 and 1
                sender.send();
                sender.send()
                // Send correct sequence but corrupted packet
                const pkt = new Packet({isAck, ackNum: 0});
                pkt.damage();
                sender.receive(pkt);
                sender.should.have.property("base").equal(0);
                // Send correct sequence
                sender.receive(new Packet({isAck, ackNum: 0}));
                sender.should.have.property("base").equal(1);
                // Send sequence older than window
                sender.receive(new Packet({isAck, ackNum: 0}));
                sender.should.have.property("base").equal(1);
            });
        });

    });

    describe("GBNReceiver", function(){

        describe("#receive()", function(){
            let channel,
            sender,
            receiver,
            receivedAcks;
            const windowSize = 2;

            beforeEach(function(){
                channel = new Channel({delay: 200});
                sender = new SimpleReceiver();
                receiver = new GBNReceiver({
                    channel,
                    windowSize
                });
                sender.onReceive = packet => receivedAcks.push(packet);
                receivedAcks = [];
            });

            afterEach(function(){
                // Prevent delivery of packets after tests have finished
                channel.stop();
            });

            it("should receive a packet and send back an ack", async function(){
                receiver.should.have.property("expectedSeqNum").equal(0);
                receiver.receive(new Packet({seqNum: 0, sender, receiver}));
                receiver.should.have.property("expectedSeqNum").equal(1);
                await sleep(200);
                receivedAcks.should.have.lengthOf(1);
                receivedAcks[0].should.eql(new Packet({
                    isAck: true,
                    sender: receiver,
                    receiver: sender,
                    ackNum: 0
                }));
            });

            it("should fire onReceive() each time a packet arrives", function(){
                const receivedPkts = [];
                let pktOk = null;
                receiver.onReceive = (packet, isOk) => {
                    receivedPkts.push(packet);
                    pktOk = isOk;
                };
                const config = {sender, receiver};
                // Receive incorrect packet
                const pkt1 = new Packet({...config, seqNum: 1});
                receiver.receive(pkt1);
                receivedPkts.should.have.lengthOf(1);
                pktOk.should.be.false;
                receivedPkts[0].should.equal(pkt1);
                // Receive correct packet
                const pkt2 = new Packet({...config, seqNum: 0});
                receiver.receive(pkt2);
                receivedPkts.should.have.lengthOf(2);
                receivedPkts[1].should.equal(pkt2);
                pktOk.should.be.true;
            });

            it(`should acknowledge the previous sequence when not receiving the 
                expected sequence`, async function(){
                receiver.receive(new Packet({
                    sender,
                    receiver,
                    seqNum: 1
                }));
                await sleep(200);
                receivedAcks.should.have.lengthOf(1);
                // The amount of sequence numbers available should be twice the
                // size of the window used so, as the sequence numbers start
                // from 0 the last sequence is:
                const previousSequence = windowSize * 2 - 1;
                receivedAcks[0].should.eql(new Packet({
                    sender: receiver,
                    receiver: sender,
                    isAck: true,
                    ackNum: previousSequence
                }));
            });

            it(`should acknowledge the previous sequence when receiving a
                corrupted packet`, async function(){
                const pkt = new Packet({
                    sender,
                    receiver,
                    seqNum: 0
                });
                pkt.damage();
                // Correct sequence, but damaged packet
                receiver.receive(pkt);
                await sleep(200);
                receivedAcks.should.have.lengthOf(1);
                const previousSequence = windowSize * 2 - 1;
                receivedAcks[0].should.eql(new Packet({
                    sender: receiver,
                    receiver: sender,
                    isAck: true,
                    ackNum: previousSequence
                }));
            });

            it("should fire onSend() each time a response is sent", function(){
                const sentAcks = [];
                const config = {sender, receiver};
                receiver.onSend = packet => sentAcks.push(packet);
                // Receive incorrect packet
                receiver.receive(new Packet({...config, seqNum: 2}));
                sentAcks.should.have.lengthOf(1);
                const ackConfig = {
                    sender: receiver,
                    receiver: sender,
                    isAck: true
                };
                sentAcks[0].should.eql(new Packet({
                    ...ackConfig,
                    ackNum: windowSize * 2 - 1
                }));
                // Receive correct packet
                receiver.receive(new Packet({...config, seqNum: 0}));
                sentAcks.should.have.lengthOf(2);
                sentAcks[1].should.eql(new Packet({
                    ...ackConfig,
                    ackNum: 0
                }));
            });
        });
    });

    context("Use GBNSender and GBNReceiver together", function(){
        const windowSize = 3;
        const delay = 200;
        const timeout = 450;
        const channel = new Channel({delay});
        const receiver = new GBNReceiver({
            channel,
            windowSize
        });
        const sender = new GBNSender({
            receiver,
            channel,
            timeout,
            windowSize
        });
        const sentPkts = [];
        sender.onSend = pkt => sentPkts.push(pkt);
        const sentAcks = [];
        receiver.onSend = pkt => sentAcks.push(pkt);

        after(function(){
            sender.stop();
            channel.stop();
        })

        specify(`they should be able to interchange packets through an
            unreliable channel`, async function(){
            sender.send();
            sender.send();
            sender.send();
            sentPkts.should.have.lengthOf(3);
            // Damage the second packet
            sentPkts[1].damage();
            await sleep(delay);
            // The receiver should have responded
            sentAcks.should.have.lengthOf(3);
            for(const ack of sentAcks)
                ack.should.eql(new Packet({
                    sender: receiver,
                    receiver: sender,
                    isAck: true,
                    ackNum: 0
                }));
            // Wait for the sender's timeout
            await sleep(delay + timeout);
            sentPkts.should.have.lengthOf(5);
            sentPkts.slice(-2).forEach((pkt, i) => {
                pkt.should.eql(new Packet({
                    sender,
                    receiver,
                    seqNum: i + 1,
                    wasReSent: true
                }));
            });
            // Lose the second re-sent packet
            channel.losePacket(sentPkts[4]);
            await sleep(delay);
            sentAcks.should.have.lengthOf(4);
            sentAcks[3].should.have.property("ackNum").equal(1);
            // Damage the receiver's response
            sentAcks[3].damage();
            // Wait for the sender to timeout again
            await sleep(timeout)
            sentPkts.should.have.lengthOf(7);
            // Wait for responses to finally arrive
            await sleep(delay * 2);
            sender.should.have.property("base").equal(3);
        });
    });
});