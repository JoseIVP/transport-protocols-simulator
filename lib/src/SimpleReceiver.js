/** @module SimpleReceiver*/

import { AbstractARQReceiver } from "./abstractNodes.js";

/**
 * A class that receives all packets and does nothing with them.
 */
class SimpleReceiver extends AbstractARQReceiver{

    constructor(){
        super({channel: null, windowSize: null});
    }

    _checkReceivedPkt(packet){
        return true;
    }

    _processExpectedPkt(packet){
        return;
    }

    _processUnexpectedPkt(packet){
        return;
    }

}

export default SimpleReceiver;
