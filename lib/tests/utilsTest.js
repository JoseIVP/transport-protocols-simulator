import { Timeout } from "../src/utils.js";

describe("utils.js", function(){

    describe("Timeout", function(){

        describe("#Timeout()", function(){
            let counter = 0;
            it("should start a timeout and execute the given callback when it ends", function(done){
                new Timeout(1000, () => {
                    counter++;
                });
                setTimeout(() => {
                    counter.should.equal(1);
                    done();
                }, 1000);
            });
        });

        describe("#stop()", function(){
            let counter = 0;

            it("should stop the timeout", function(done){
                const timeout = new Timeout(1000, ()=> {
                    counter++;
                });
                setTimeout(() => {
                    timeout.stop();
                }, 500);
                setTimeout(() => {
                    counter.should.equal(0);
                    done();
                }, 1500);
            });
        });

        describe("#pause()", function(){
            let counter = 0;
            it("should pause the timeout", function(done){
                const timeout = new Timeout(1000, ()=> {
                    counter++;
                });
                setTimeout(() => {
                    timeout.pause();
                }, 500);
                setTimeout(() => {
                    counter.should.equal(0);
                    done();
                }, 1500);
            });
        });

        describe("#resume()", function(){
            let counter = 0;
            
            beforeEach(function(){
                counter = 0;
            });
            
            it("should resume the timeout after being paused", function(done){
                const timeout = new Timeout(1000, ()=> {
                    counter++;
                });
                setTimeout(() => {
                    timeout.pause();
                }, 500); // 500 ms should remain for the timeout
                setTimeout(() => {
                    timeout.resume();
                    counter.should.equal(0);
                }, 1100); // 1100 to make sure the callback wasn't called at 1000
                setTimeout(() => {
                    counter.should.equal(1);
                    done();
                }, 1602); // 1600 plus some error
            });

            it("should not resume the timeout after being stopped", function(done){
                const timeout = new Timeout(1000, ()=> {
                    counter++;
                });
                setTimeout(() => {
                    timeout.stop();
                }, 500); // 500 ms should remain for the timeout
                setTimeout(() => {
                    timeout.resume();
                    counter.should.equal(0);
                }, 1100); // 1100 to make sure the callback wasn't called at 1000
                setTimeout(() => {
                    counter.should.equal(0);
                    done();
                }, 1602); // 1600 plus some error
            });

            it("should do nothing if the timeout is running", function(done){
                // We will expect resume() to not trigger additional timeouts
                let counter = 0;
                const timeout = new Timeout(1000, () => {
                    counter++;
                });
                setTimeout(() => {
                    timeout.resume();
                }, 500);
                setTimeout(() => {
                    counter.should.equal(1);
                    done();
                // Wait a little longer than 1000 to check the equality
                }, 1100);

            });

            it("should be able to resume and pause multiple times", function(done){
                let counter = 0;
                const timeout = new Timeout(1000, () => {
                    counter++;
                });
                setTimeout(() => {
                    timeout.pause();
                }, 200);
                setTimeout(() => {
                    timeout.resume();
                }, 400); // Wait for 200 ms after pausing
                setTimeout(() => {
                    timeout.pause();
                }, 600);
                setTimeout(() => {
                    timeout.resume();
                }, 800); // Wait another 200 ms
                setTimeout(() => {
                    counter.should.equal(1);
                    done();
                }, 1405); // Total should be 1400 plus some error
            });
        });
    });
});