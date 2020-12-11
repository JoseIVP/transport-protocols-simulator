import Packet from "../src/Packet.js";

describe("Packet", function(){
    let packet = null;
    
    before(function (){
        packet = new Packet({});
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
    });

    describe("#damage()", function(){
        it("should turn isCorrupted true", function(){
            packet.should.have.property("isCorrupted").equal(false);
            packet.damage();
            packet.should.have.property("isCorrupted").equal(true);
        });
    });
});
