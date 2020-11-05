export default class SettingsCard extends HTMLElement {
    
    constructor(){
        super();
        this.attachShadow({mode: "open"});
        const template = document.getElementById("settings-card");
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Set card open/close behaviour
        this.details = this.shadowRoot.querySelector("details");
        // Prevent actioning <details> default toggle zone
        this.details.addEventListener("click", e => e.preventDefault());
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

        // Set form elements behaviour
        this._initFormElements();

        // Set execution behaviour
        this.running = false;
        this.toggleRunBtn = this.shadowRoot.getElementById("toggle-run");
        this.toggleRunBtn.onclick = () => {
            this.running ? this.stop() : this.start();
        };
    }

    /**
     * Toggles between the opened and closed states of the card.
     */
    toggle(){
        // Measure heights and animate transition
        const {details} = this;
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
     * Changes the seleted tab to the one with the attribute
     * data-tab set to tabName.
     * @param {string} tabName - The name of the tab to select.
     */
    selectTab(tabName){
        this.selectedTab?.classList.remove("active");
        this.selectedTabButton?.classList.remove("active");
        this.selectedTab = this.shadowRoot.querySelector(`section[data-tab="${tabName}"]`);
        this.selectedTabButton = this.shadowRoot.querySelector(`button[data-tab="${tabName}"]`);
        this.selectedTab.classList.add("active");
        this.selectedTabButton.classList.add("active");
    }

    /**
     * Gets the data from the forms, validates it, and then calls
     * onStart() with a settings object as argument.
     */
    start(){
        const settingsForm = this.shadowRoot.getElementById("settings-form");
        if(!settingsForm.reportValidity())
            return
        this.running = true;
        // Tell the user that the settings are locked
        const lock = this.shadowRoot.querySelector(".lock");
        lock.classList.add("active");
        this.toggleRunBtn.classList.add("running");
        const settingsList = [
            "protocol",
            "delay",
            "timeout",
            "packetRate",
            "windowSize",
            "lossProb"
        ]
        const settings = {};
        // Convert the data and disable the form elements
        for(const setting of settingsList){
            const formElement = settingsForm.elements[setting];
            formElement.disabled = true;
            settings[setting] = Number.parseInt(formElement.value);
        }
        settings.lossProb /= 10;
        this.onStart(settings);
    }

    /**
     * Unlock the entry of data to the forms, and call onStop().
     */
    stop(){
        this.running = false;
        this.toggleRunBtn.classList.remove("running");
        const formElements = this.shadowRoot.getElementById("settings-form").elements;
        for(let i=0; i<formElements.length; i++){
            formElements[i].disabled = false;
        }
        const lock = this.shadowRoot.querySelector(".lock");
        lock.classList.remove("active");
        this.onStop();
    }

    /**
     * Init the form elements behaviour, making them change the
     * paragraph below them.
     */
    _initFormElements(){
        const formElements = this.shadowRoot.getElementById("settings-form").elements;
        for(let i=0; i<formElements.length; i++){
            const element = formElements[i];
            // SELECT does not have a paragraph so we only
            // take the INPUT tags
            if(element.tagName == "INPUT"){
                const p = element.nextElementSibling;
                p.textContent = element.value;
                if(element.name == "lossProb")
                    element.oninput = () => {
                        p.textContent = element.value / 10;
                    };
                else
                    element.oninput = () => {
                        p.textContent = element.value;
                    };
            }
        }
    }
}
