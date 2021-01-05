import "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.4/Chart.bundle.min.js";

/**
 * Truncates the decimal part of a number.
 * @param {number} x - The number to truncate.
 * @param {number} places - The number of decimal places to leave.
 */
function trunc(x, places){
    return Math.trunc(x * 10 ** places) / 10 ** places;
}

/**
 * Fills labels with numbers from 2 to sampleSize with a step of size 2.
 * @param {Array} labels - The array of labels to fill.
 * @param {number} sampleSize - The number of labels to add.
 */
function fillLabels(labels, sampleSize){
    for(let i=1; i<= sampleSize; i++)
        labels.push(i*2);
}

// The initial value for the next label to add to the x axis
const INITIAL_NEXT_LABEL = 34;

/**
 * A web component for a card that shows various statistics and a chart.
 */
export default class StatisticsCard extends HTMLElement {

    /**
     * Creates a new StatisticsCard component.
     */
    constructor(){
        super();
        this.attachShadow({mode: "open"});
        const template = document.querySelector("#statistics-card");
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        // Counters of packets:
        this._pktsSent = this.shadowRoot.getElementById("pkts-sent");
        this._pktsConfirmed = this.shadowRoot.getElementById("pkts-confirmed");
        this._pktsReSent = this.shadowRoot.getElementById("pkts-re-sent");
        this._pktsReceived = this.shadowRoot.getElementById("pkts-received");
        this._pktsReceivedOk = this.shadowRoot.getElementById("pkts-received-ok");
        this._acksSent = this.shadowRoot.getElementById("acks-sent");
        this._acksReceived = this.shadowRoot.getElementById("acks-received");
        this._acksReceivedOk = this.shadowRoot.getElementById("acks-received-ok");
        this._pktsSentRate = this.shadowRoot.getElementById("pkts-sent-rate");
        this._totalPktsSentRate = this.shadowRoot.getElementById("total-pkts-sent-rate");
        this._pktsConfirmedRate = this.shadowRoot.getElementById("pkts-confirmed-rate");
        this._totalPktsConfirmedRate = this.shadowRoot.getElementById("total-pkts-confirmed-rate");
        this._acksReceivedOkRate = this.shadowRoot.getElementById("acks-received-ok-rate");
        this._totalAcksReceivedOkRate = this.shadowRoot.getElementById("total-acks-received-ok-rate");
        // Arrays with packet rates:
        this._pktsSentRateData = [];
        this._totalPktsSentRateData = [];
        this._pktsConfirmedRateData = [];
        this._totalPktsConfirmedRateData = [];
        this._acksReceivedOkRateData = [];
        this._totalAcksReceivedOkRateData = [];
        this._sampleSize = 16; // The number of points to show in the x axis
        this._labels = []; // The x axis time labels
        fillLabels(this._labels, this._sampleSize);
        // The next label to add to the x axis when it is moved
        this._nextLabel = INITIAL_NEXT_LABEL;
        this._chartCanvas = this.shadowRoot.getElementById("chart");
        Chart.defaults.global.animation.duration = 0;
        Chart.defaults.global.defaultFontColor = "#4f4f4f";
        Chart.defaults.global.elements.line.fill = false;
        Chart.defaults.global.elements.line.tension = 0;
        this._renderChart();
        // Re-render the chart when the window is resized
        window.addEventListener("resize", () => {
            this._chart.destroy();
            this._renderChart();
        });
        // Set the bahavior to change the order of the figures
        this.shadowRoot.querySelector("#change-order-btn").onclick = () => {
            this.shadowRoot.querySelector("#stats-content").classList.toggle("reverse");
        };
    }

    /**
     * Creates and renders a new chart instance.
     * @private
     */
    _renderChart(){
        // The number of ticks to show in the x axis
        let maxTicksLimit; 
        if(window.innerWidth <= 550){
            this._chartCanvas.height = 300;
            maxTicksLimit = 10;
        }else{
           this._chartCanvas.height = 150; 
           maxTicksLimit = 16;
        }
        this._chart = new Chart(this._chartCanvas, {
            type: "line",
            data: {
                labels: this._labels,
                datasets: [
                    {
                        label: "Total packets sent",
                        data: this._totalPktsSentRateData,
                        borderColor: "#65A2F4",
                        pointBackgroundColor: "#B2D0F9",
                    },
                    {
                        label: "Packets sent (last 2 s)",
                        data: this._pktsSentRateData,
                        borderColor: "#F96060",
                        pointBackgroundColor: "#FCB0B0",
                    },
                    {
                        label: "Total packets confirmed",
                        data: this._totalPktsConfirmedRateData,
                        borderColor: "#3AB146",
                        pointBackgroundColor: "#9CD8A2",
                    },
                    {
                        label: "Packets confirmed (last 2 s)",
                        data: this._pktsConfirmedRateData,
                        borderColor: "#5D4037",
                        pointBackgroundColor: "#AE9F9B",
                    },
                    {
                        label: "Total acks received ok",
                        data: this._totalAcksReceivedOkRateData,
                        borderColor: "#FC9700",
                        pointBackgroundColor: "#FDCB80",
                    },
                    {
                        label: "Acks received ok (last 2 s)",
                        data: this._acksReceivedOkRateData,
                        borderColor: "#CF1AED",
                        pointBackgroundColor: "#E78CF6",
                    },
                ]
            },
            options: {
                scales: {
                    yAxes: [{
                            scaleLabel: {
                                display: true,
                                labelString: "Packets / s",
                                fontSize: 15
                            }
                    }],
                    xAxes: [{
                            ticks: {maxTicksLimit},
                            scaleLabel: {
                                display: true,
                                labelString: "Time since start (s)",
                                fontSize: 15
                            }
                    }]
                },
                legend: {
                    align: "start",
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        boxWidth: 15,
                        padding: 10,
                        fontSize: 14,
                    }
                },
            }
        });
    }

    /**
     * Updates the shown statistics from the data in a StatsComputer object.
     * @param {StatsComputer} stats
     */
    update(stats){
        // Update the counters of the table
        this._pktsSent.textContent = stats.totalPktsSent;
        this._pktsConfirmed.textContent = stats.totalPktsConfirmed;
        this._pktsReSent.textContent = stats.totalPktsReSent;
        this._pktsReceived.textContent = stats.totalPktsReceived;
        this._pktsReceivedOk.textContent = stats.totalPktsReceivedOk;
        this._acksSent.textContent = stats.totalAcksSent;
        this._acksReceived.textContent = stats.totalAcksReceived;
        this._acksReceivedOk.textContent = stats.totalAcksReceivedOk;
        // Get packet rates data
        const pktsSentRate = trunc(stats.pktsSentRate, 3);
        const totalPktsSentRate = trunc(stats.totalPktsSentRate, 3);
        const pktsConfirmedRate = trunc(stats.pktsConfirmedRate, 3);
        const totalPktsConfirmedRate = trunc(stats.totalPktsConfirmedRate, 3);
        const acksReceivedOkRate = trunc(stats.acksReceivedOkRate, 3);
        const totalAcksReceivedOkRate = trunc(stats.totalAcksReceivedOkRate, 3);
        // Update the packet rates in the table
        this._pktsSentRate.textContent = pktsSentRate;
        this._totalPktsSentRate.textContent = totalPktsSentRate;
        this._pktsConfirmedRate.textContent = pktsConfirmedRate;
        this._totalPktsConfirmedRate.textContent = totalPktsConfirmedRate;
        this._acksReceivedOkRate.textContent = acksReceivedOkRate;
        this._totalAcksReceivedOkRate.textContent = totalAcksReceivedOkRate;
        // Update arrays of data
        this._pktsSentRateData.push(pktsSentRate);
        this._totalPktsSentRateData.push(totalPktsSentRate);
        this._pktsConfirmedRateData.push(pktsConfirmedRate);
        this._totalPktsConfirmedRateData.push(totalPktsConfirmedRate);
        this._acksReceivedOkRateData.push(acksReceivedOkRate);
        this._totalAcksReceivedOkRateData.push(totalAcksReceivedOkRate);
        if(this._pktsSentRateData.length > this._sampleSize){
            // Move the x axis to the left
            this._totalPktsSentRateData.shift();
            this._totalAcksReceivedOkRateData.shift();
            this._pktsConfirmedRateData.shift();
            this._totalPktsConfirmedRateData.shift();
            this._acksReceivedOkRateData.shift();
            this._pktsSentRateData.shift();
            this._labels.push(this._nextLabel);
            this._labels.shift();
            this._nextLabel += 2;
        }
        this._chart.update();
    }

    /**
     * Resets the statistics card.
     */
    reset(){
        // Reset the table
        this._pktsSent.textContent = 0;
        this._pktsConfirmed.textContent = 0;
        this._pktsReSent.textContent = 0;
        this._pktsReceived.textContent = 0;
        this._pktsReceivedOk.textContent = 0;
        this._acksSent.textContent = 0;
        this._acksReceived.textContent = 0;
        this._acksReceivedOk.textContent = 0;
        this._pktsSentRate.textContent = 0;
        this._totalPktsSentRate.textContent = 0;
        this._acksReceivedOkRate.textContent = 0;
        this._totalAcksReceivedOkRate.textContent = 0;
        // Reset arrays of data and labels
        this._pktsSentRateData.splice(0, this._pktsSentRateData.length);
        this._totalPktsSentRateData.splice(0, this._totalPktsSentRateData.length);
        this._pktsConfirmedRateData.splice(0, this._pktsConfirmedRateData.length);
        this._totalPktsConfirmedRateData.splice(0, this._totalPktsConfirmedRateData.length);
        this._acksReceivedOkRateData.splice(0, this._acksReceivedOkRateData.length);
        this._totalAcksReceivedOkRateData.splice(0, this._totalAcksReceivedOkRateData.length);
        this._labels.splice(0, this._labels.length);
        fillLabels(this._labels, this._sampleSize);
        this._nextLabel = INITIAL_NEXT_LABEL;
        this._chart.update();
    }

}