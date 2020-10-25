import Packet from "../src/Packet.js";
import Node from "../src/Node.js";

describe("Packet", function(){
    let packet = null;
    
    before(function (){
        packet = new Packet({
            receiver: new Node(),
        });
    });

    describe("#isCorrupted", function(){
        it("should be false by default", function(){
            packet.should.have.property("isCorrupted").equal(false);
        });
    });

    describe("#isAck", function(){
        it("should be false by default", function(){
            packet.should.have.property("isAck").equal(false);
        });
    });

    describe("#ackNum", function(){
        it("should be null by default", function(){
            packet.should.have.property("ackNum").equal(null);
        })
    })

    describe("#getCorrupted()", function(){
        it("should turn isCorrupted true", function(){
            packet.should.have.property("isCorrupted").equal(false);
            packet.getCorrupted();
            packet.should.have.property("isCorrupted").equal(true);
        });
    });
})
