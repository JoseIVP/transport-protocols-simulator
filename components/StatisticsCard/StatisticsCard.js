
/**
 * Truncates the decimal part of a number.
 * @param {number} x - The number to truncate.
 * @param {number} places - The number of decimal places to leave.
 */
function trunc(x, places){
    return Math.trunc(x * 10 ** places) / 10 ** places;
}

export default class StatisticsCard extends HTMLElement {
    
    constructor(){
        super();
        this.attachShadow({mode: "open"});
        const template = document.querySelector("#statistics-card");
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.pktsSent = this.shadowRoot.getElementById("pkts-sent");
        this.pktsReSent = this.shadowRoot.getElementById("pkts-re-sent");
        this.pktsReceived = this.shadowRoot.getElementById("pkts-received");
        this.pktsReceivedOk = this.shadowRoot.getElementById("pkts-received-ok");
        this.acksSent = this.shadowRoot.getElementById("acks-sent");
        this.acksReceived = this.shadowRoot.getElementById("acks-received");
        this.acksReceivedOk = this.shadowRoot.getElementById("acks-received-ok");
        this.pktsSentPerSecond = this.shadowRoot.getElementById("pkts-sent-per-second");
        this.totalPktsSentPerSecond = this.shadowRoot.getElementById("total-pkts-sent-per-second");
        this.acksReceivedOkPerSecond = this.shadowRoot.getElementById("acks-received-ok-per-second");
        this.totalAcksReceivedOkPerSecond = this.shadowRoot.getElementById("total-acks-received-ok-per-second");
    }

    /**
     * Update the shown statistics from the data in a StatsComputer object.
     * @param {StatsComputer} stats
     */
    update(stats){
        this.pktsSent.textContent = stats.totalPacketsSent;
        this.pktsReSent.textContent = stats.totalPacketsReSent;
        this.pktsReceived.textContent = stats.totalPacketsReceived;
        this.pktsReceivedOk.textContent = stats.totalPacketsReceivedOk;
        this.acksSent.textContent = stats.totalAcksSent;
        this.acksReceived.textContent = stats.totalAcksReceived;
        this.acksReceivedOk.textContent = stats.totalAcksReceivedOk;
        this.pktsSentPerSecond.textContent = trunc(stats.packetsSentPerSecond, 3);
        this.totalPktsSentPerSecond.textContent = trunc(stats.totalPacketsSentPerSecond, 3);
        this.acksReceivedOkPerSecond.textContent = trunc(stats.acksReceivedOkPerSecond, 3);
        this.totalAcksReceivedOkPerSecond.textContent = trunc(stats.totalAcksReceivedOkPerSecond, 3);
    }

}