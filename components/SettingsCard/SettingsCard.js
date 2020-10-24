export default class SettingsCard extends HTMLElement {
    
    constructor(){
        super();
        this.attachShadow({mode: "open"});
        const template = document.getElementById("settings-card");
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Set card behaviour
        this.details = this.shadowRoot.querySelector("details");
        // Prevent actioning <details> default toggle zone
        this.details.addEventListener("click", e => e.preventDefault());
        const toggleBtn = this.shadowRoot.querySelector(".toggle");
        toggleBtn.addEventListener("click", () => this.toggle());

        // Set tabs behaviour
        this.selectTab("settings");
        const tabMenu = this.shadowRoot.querySelector(".tabs");
        tabMenu.addEventListener("click", (event) => {
            const tab = event.target.dataset.tab;
            this.selectTab(tab);
        });
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
}
