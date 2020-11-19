/** @module utils  */

/**
 * A class that represents a timeout.
 */
export class Timeout{
    
    // The different states of the timeout
    static _RUNNING = 0;
    static _PAUSED = 1;
    static _STOPPED = 2;
    static _ENDED = 3;
    
    /**
     * Creates and starts a new timeout.
     * @param {number} duration - The duration of the timeout in miliseconds.
     * @param {function} callback - The callback to execute when the timeout is completed.
     * @param {boolean} [repeat=false] - true if the timeout should repeat like an interval.
     */
    constructor(duration, callback, repeat=false){
        this._duration = duration;
        this._elapsedTime = 0;
        this._callback = callback;
        this._repeat = repeat;
        this._start(duration);
    }

    /**
     * Starts or resumes the timeout.
     * @param {number} duration - The duration of the timeout.
     * @private
     */
    _start(duration){
        this._state = Timeout._RUNNING;
        this._timeoutId = setTimeout(() => {
            if(this._repeat){
                this._timeoutId = setInterval(() => {
                    this._elapsedTime = 0;
                    this._resumeTime = Date.now();
                    this._callback();
                }, this._duration);
                this._elapsedTime = 0;
                this._resumeTime = Date.now();
                this._callback();
            }else{
                this._state = Timeout._ENDED;
                this._callback();
            }
        }, duration);
        this._resumeTime = Date.now();
    }

    /**
     * Stops the timeout. After this, the timeout cannot
     * be resumed.
     */
    stop(){
        if(this._state == Timeout._RUNNING){
            clearTimeout(this._timeoutId);
            this._state = Timeout._STOPPED; 
        }
    }

    /**
     * Pauses the timeout.
     */
    pause(){
        if(this._state == Timeout._RUNNING){
            clearTimeout(this._timeoutId);
            this._elapsedTime += Date.now() - this._resumeTime;
            this._state = Timeout._PAUSED;  
        }
        
    }
    
    /**
     * Resumes the timeout if it is paused.
     */
    resume(){
        if(this._state == Timeout._PAUSED){
            const time = this._duration - this._elapsedTime;
            this._start(time < 0 ? 0 : time);
        }
    }
}