import Channel from "../src/Channel.js";
import {
    SWSender,
    SWReceiver,
} from "../src/stopAndWait.js";
import Node from "../src/Node.js";
import Packet from "../src/Packet.js";

describe("SWSender", function(){

    describe("#send()", function(){
        this.timeout(1500);
        const receiver = new Node();
        const channel = new Channel({delay: 1000});
        const sender = new SWSender({
            receiver,
            channel,
        });
        let packetReceived = null;
        receiver.onReceive = packet => {
            packetReceived = packet;
        }
        it("should send a packet through its channel to its receiver", function(done){
            should.not.exist(packetReceived);
            sender.should.have.property("currentSeqNum").equal(0);
            sender.should.have.property("isWaitingAck").equal(false);
            sender.send();
            sender.should.have.property("currentSeqNum").equal(0);
            sender.should.have.property("isWaitingAck").equal(true);
            setTimeout(()=>{
                packetReceived.should.have.property("seqNum").equal(0);
                done();
            }, 1100);
        });

    });

    describe("#receive()", function(){
        this.timeout(2500);
        const receiver = new Node();
        const channel = new Channel({delay: 1000});
        const sender = new SWSender({
            receiver,
            channel,
        });
        receiver.onReceive = packet => {
            const ack = new Packet({
                seqNum: 0,
                isAck: true,
                sender: receiver,
                receiver: sender
            })
            receiver.send(ack, channel);
        }
        let ackReceived = null;
        sender.onReceive = packet => {
            ackReceived = packet;
        }
        it("should receive an ACK after sending a packet", function(done){
            should.not.exist(ackReceived);
            sender.send();
            sender.should.have.property("currentSeqNum").equal(0);
            sender.should.have.property("isWaitingAck").equal(true);
            setTimeout(() => {
                ackReceived.should.have.property("seqNum").equal(0);
                ackReceived.should.have.property("isAck").equal(true);
                sender.should.have.property("currentSeqNum").equal(1);
                sender.should.have.property("isWaitingAck").equal(false);
                done();
            }, 2100);
        });
    });
});

describe("SWReceiver", function(){

    describe("#receive()", function(){
        this.timeout(4500);
        const receiver = new SWReceiver();
        const sender = new SWSender({
            receiver,
            channel: new Channel({delay: 1000})
        })
        const packetsReceived = [];
        const acksReceived = [];
        receiver.onReceiveOk = packet => {
            packetsReceived.push(packet);
        }
        sender.onReceive = packet => {
            acksReceived.push(packet);
        }
        it("should receive a packet and send an ACK back", function(done){
            packetsReceived.should.have.lengthOf(0);
            acksReceived.should.have.lengthOf(0);
            sender.send();
            setTimeout(() => {
                packetsReceived[0].should.have.property("seqNum").equal(0);
                receiver.should.have.property("expectedSeqNum").equal(1);
            }, 1100);
            setTimeout(()=> {
                acksReceived[0].should.have.property("isAck").equal(true);
                acksReceived[0].should.have.property("seqNum").equal(0);
                sender.send();
            }, 2100);
            setTimeout(() => {
                acksReceived.should.have.lengthOf(2);
                packetsReceived.should.have.lengthOf(2);
                acksReceived[1].should.have.property("isAck").equal(true);
                acksReceived[1].should.have.property("seqNum").equal(1);
                packetsReceived[1].should.have.property("seqNum").equal(1);
                receiver.should.have.property("expectedSeqNum").equal(0);
                done();
            }, 4200)
        });
    });

})
