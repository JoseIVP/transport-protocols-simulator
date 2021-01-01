import { sleep, Timeout } from "../src/utils.js";

describe("utils.js", function(){

    describe("sleep()", function(){
        it("should return a promise, that is resolved after a given amount of time", async function(){
            const start = Date.now();
            await sleep(200);
            const time = Date.now() - start;
            time.should.be.closeTo(200, 1);
        })
    })

    describe("Timeout", function(){
        let counter;

        beforeEach(function(){
            counter = 0;
        });

        describe("#Timeout()", function(){
            it("should start a timeout and execute the given callback when it ends", async function(){
                new Timeout(200, () => counter++);
                await sleep(200);
                counter.should.equal(1);
            });
        });

        describe("#stop()", function(){
            it("should stop the timeout", async function(){
                const timeout = new Timeout(200, ()=> counter++);
                await sleep(100);
                timeout.stop();
                await sleep(200);
                counter.should.equal(0);
            });
        });

        describe("#pause()", function(){
            it("should pause the timeout", async function(){
                const timeout = new Timeout(200, ()=> counter++);
                await sleep(100);
                timeout.pause();
                await sleep(200);
                counter.should.equal(0);
            });
        });

        describe("#resume()", function(){
            
            it("should resume the timeout after being paused", async function(){
                const timeout = new Timeout(200, ()=> counter++);
                await sleep(100);
                timeout.pause();
                await sleep(100);
                timeout.resume();
                counter.should.equal(0);
                await sleep(100);
                counter.should.equal(1);
            });

            it("should not resume the timeout after being stopped", async function(){
                const timeout = new Timeout(200, ()=> counter++);
                await sleep(100);
                timeout.stop();
                await sleep(100);
                timeout.resume();
                counter.should.equal(0);
                await sleep(200);
                counter.should.equal(0);
            });

            it("should do nothing if the timeout is running", async function(){
                // We will expect resume() to not trigger additional timeouts
                const timeout = new Timeout(200, () => counter++);
                await sleep(100);
                timeout.resume();
                await sleep(200);
                counter.should.equal(1);
            });

            it("should be able to resume and pause multiple times", async function(){
                const timeout = new Timeout(1000, () => counter++);
                await sleep(200); // total time: 200 ms
                timeout.pause();
                await sleep(200);
                timeout.resume();
                await sleep(200); // total time: 400 ms
                timeout.pause();
                await sleep(200);
                timeout.resume();
                await sleep(600); // total time: 1000 ms
                counter.should.equal(1);
            });

            it("should be able to resume and pause an interval", async function(){
                const interval = new Timeout(500, () => {
                    // Log to detect infinite interval
                    console.log("Adding to counter");
                    counter++;
                }, true);
                await sleep(500);
                counter.should.equal(1); // End of lap 1
                await sleep(100);
                interval.pause(); // Lap 2, 100 ms
                await sleep(100);
                interval.resume();
                await sleep(100);
                interval.pause(); // Lap 2, 200 ms
                await sleep(100);
                interval.resume();
                await sleep(200);
                counter.should.equal(1, "Callback was executed before"); // Lap 2, 400 ms
                await sleep(100);
                counter.should.equal(2); // Lap 2, 500 ms
                await sleep(500);
                counter.should.equal(3); // End of lap 3
                interval.stop();
            });

        });
    });
});