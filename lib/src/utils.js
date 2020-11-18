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
     */
    constructor(duration, callback){
        this._duration = duration;
        this._elapsedTime = 0;
        this._callback = callback;
        this._start(duration);
    }

    /**
     * Starts or resumes the timeout.
     * @param {number} duration - The duration of the timeout.
     * @private
     */
    _start(duration){
        this._state = this._RUNNING;
        this._timeoutId = setTimeout(() => {
            this._state = this._ENDED;
            this._callback();
        }, duration);
        this._resumeTime = Date.now();
    }

    /**
     * Stops the timeout. After this, the timeout cannot
     * be resumed.
     */
    stop(){
        if(this._state == this._RUNNING){
           clearTimeout(this._timeoutId);
            this._state = this._STOPPED; 
        }
    }

    /**
     * Pauses the timeout.
     */
    pause(){
        if(this._state == this._RUNNING){
            clearTimeout(this._timeoutId);
            this._elapsedTime += Date.now() - this._resumeTime;
            this._state = this._PAUSED;  
        }
        
    }
    
    /**
     * Resumes the timeout if it is paused.
     */
    resume(){
        if(this._state == this._PAUSED){
            const time = this._duration - this._elapsedTime;
            this._start(time < 0 ? 0 : time);
        }
    }
}