import "https://unpkg.com/chai/chai.js";
import "https://unpkg.com/mocha/mocha.js";

mocha.checkLeaks();
mocha.setup('bdd');
should = chai.should();

async function runTests(){
    await import("./PacketTest.js");
    await import("./ChannelTest.js");
    await import("./NodeTest.js");
    await import("./stopAndWaitTest.js");
    await import("./goBackNTest.js");
    await import("./selectiveRepeatTest.js");
    mocha.run();
}

runTests();