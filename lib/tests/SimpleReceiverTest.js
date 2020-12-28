import Packet from "../src/Packet.js";
import SimpleReceiver from "../src/SimpleReceiver.js";


describe("SimpleReceiver", function(){

    const receiver = new SimpleReceiver(); 

    describe("#receive()", function(){
        const packet = new Packet({});
        let packetReceived = null;
        let count = 0;
        receiver.onReceive = (packet, isOK) => {
            isOK.should.be.true;
            packetReceived = packet;
            count++;
        };
        it("should receive a packet and fire onReceive", function(){
            receiver.receive(packet);
            packetReceived.should.equal(packet);
            count.should.equal(1);
        });
    });

    describe("#send()", function(){
        let count = 0;
        receiver.onSend = () => count++;
        it("should return false and not trigger onSend()", function(){
            receiver.send().should.equal(false);
            count.should.equal(0);
        });
    });

});