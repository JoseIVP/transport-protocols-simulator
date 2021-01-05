/**
 * A class for a web component that enables the configuration of the simulation.
 */
export default class SettingsCard extends HTMLElement {

    /**
     * @member {HTMLDetailsElement} - The root element of the card.
     * @private
     */
    _details;
    /**
     * @member {boolean} - true if the simulation is running, false otherwise.
     * @private
     */
    _isRunning = false;
    /**
     * @member {HTMLButtonElement} - The button that allows to run and stop the
     * simulation.
     * @private
     */
    _toggleRunBtn;
    /**
     * @member {boolean} - true if the simualtion is paused, false otherwise.
     * @private
     */
    _isPaused = false;
    /**
     * @member {HTMLButtonElement} - The button that allows to pause and resume
     * the simulation.
     * @private
     */
    _togglePauseBtn;
    /**
     * @member {HTMLSectionElement} - The current active tab.
     * @private
     */
    _selectedTab;
    /**
     * @member {HTMLButtonElement} - The button of the current active tab.
     * @private
     */
    _selectedTabButton;
    
    /**
     * Creates a new SettingsCard instance.
     */
    constructor(){
        super();
        this.attachShadow({mode: "open"});
        const template = document.getElementById("settings-card");
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Set card open/close behaviour
        this._details = this.shadowRoot.querySelector("details");
        // Prevent actioning <details> default toggle zone
        this._details.addEventListener("click", e => e.preventDefault());
        const toggleBtn = this.shadowRoot.querySelector(".toggle");
        toggleBtn.addEventListener("click", () => this.toggle());
        this.shadowRoot.getElementById("settings-title")
            .addEventListener("click", () => this.toggle());

        // Set tabs behaviour
        this.selectTab("settings");
        const tabMenu = this.shadowRoot.querySelector(".tabs");
        tabMenu.addEventListener("click", (event) => {
            const tab = event.target.dataset.tab;
            this.selectTab(tab);
        });

        // Set grid behaviour
        const toggleGridBtn = this.shadowRoot.querySelector("#toggle-grid");
        toggleGridBtn.addEventListener("click", () => {
            document.body.classList.toggle("grid");
            toggleGridBtn.classList.toggle("active");
        });

        // Set form elements behaviour
        this._initFormElements();

        // Set execution behaviour
        this._toggleRunBtn = this.shadowRoot.getElementById("toggle-run");
        this._toggleRunBtn.onclick = () => {
            this._isRunning ? this.stop() : this.start();
        };
        this._togglePauseBtn = this.shadowRoot.getElementById("toggle-pause");
        this._togglePauseBtn.onclick = () => {
            this._isPaused ? this.resume() : this.pause();
        };
    }

    /**
     * Toggles between the opened and closed states of the card.
     */
    toggle(){
        // Measure heights and animate transition
        const {_details: details} = this;
        const initialHeight = getComputedStyle(details).height;
        const wasOpen = details.open;
        details.open= !details.open;
        const finalHeght = getComputedStyle(details).height;
        details.open= true; // Close after animation ends
        const keyframes = [
            {height: initialHeight},
            {height: finalHeght}
        ];
        const options = { duration: 150 };
        const animation = details.animate(keyframes, options);
        // This makes the animation consistent between states
        if(wasOpen){
            details.classList.remove("open");
            animation.onfinish = () => {
                details.open = false;
            };
        }else
            details.classList.add("open");
    }

    /**
     * Changes the seleted tab to the one with the attribute data-tab set to
     * tabName.
     * @param {string} tabName - The name of the tab to select.
     */
    selectTab(tabName){
        this._selectedTab?.classList.remove("active");
        this._selectedTabButton?.classList.remove("active");
        this._selectedTab = this.shadowRoot.querySelector(`section[data-tab="${tabName}"]`);
        this._selectedTabButton = this.shadowRoot.querySelector(`button[data-tab="${tabName}"]`);
        this._selectedTab.classList.add("active");
        this._selectedTabButton.classList.add("active");
    }

    /**
     * Gets the data from the forms, validates it, and then calls onStart() with
     * a settings object as argument.
     */
    start(){
        const settingsForm = this.shadowRoot.getElementById("settings-form");
        if(!settingsForm.reportValidity())
            return
        this._isRunning = true;
        // Tell the user that the settings are locked
        const lock = this.shadowRoot.querySelector(".lock");
        lock.classList.add("active");
        this._toggleRunBtn.classList.add("running");
        this._togglePauseBtn.disabled = false;
        const settingsList = [
            "protocol",
            "delay",
            "timeout",
            "packetRate",
            "windowSize",
            "lossProb",
            "damageProb"
        ];
        const settings = {};
        // Convert the data and disable the form elements
        for(const setting of settingsList){
            const formElement = settingsForm.elements[setting];
            formElement.disabled = true;
            settings[setting] = Number.parseInt(formElement.value);
        }
        settings.lossProb /= 10;
        settings.damageProb /= 10;
        this.onStart(settings);
    }

    /**
     * Unlocks the entry of data to the forms, and calls onStop().
     */
    stop(){
        // Reset playing button
        this._isRunning = false;
        this._toggleRunBtn.classList.remove("running");
        // Reset pausing button
        this._isPaused = false;
        this._togglePauseBtn.classList.remove("paused");
        this._togglePauseBtn.disabled = true;
        // Unlock form inputs
        const formElements = this.shadowRoot.getElementById("settings-form").elements;
        for(let i=0; i<formElements.length; i++){
            formElements[i].disabled = false;
        }
        const lock = this.shadowRoot.querySelector(".lock");
        lock.classList.remove("active");
        this.onStop();
    }

    /**
     * Initializes the elements of the form and their behaviour, making them
     * change the paragraph below them.
     * @private
     */
    _initFormElements(){
        const inputs = this.shadowRoot.querySelectorAll("input");
        for(const input of inputs){
            const p = input.nextElementSibling;
            p.textContent = input.value;
            if(input.name == "lossProb" || input.name == "damageProb")
                input.oninput = () => {
                    p.textContent = input.value / 10;
                };
            else
                input.oninput = () => {
                    p.textContent = input.value;
                };
        }
    }

    /**
     * Changes the states of the pause button to paused, and calls onPause().
     */
    pause(){
        if(this._isRunning && !this._isPaused){
            this._isPaused = true;
            this._togglePauseBtn.classList.add("paused");
            this.onPause();
        }
    }

    /**
     * Removes the paused state from the pause button and calls onResume().
     */
    resume(){
        if(this._isPaused){
            this._isPaused = false;
            this._togglePauseBtn.classList.remove("paused");
            this.onResume(); 
        }
    }
}
