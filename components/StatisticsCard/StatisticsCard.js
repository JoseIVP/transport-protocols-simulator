import "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.4/Chart.bundle.min.js";

/**
 * Truncates the decimal part of a number.
 * @param {number} x - The number to truncate.
 * @param {number} places - The number of decimal places to leave.
 */
function trunc(x, places){
    return Math.trunc(x * 10 ** places) / 10 ** places;
}

const INITIAL_NEXT_LABEL = 34;

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
        this.pktsSentRate = this.shadowRoot.getElementById("pkts-sent-per-second");
        this.totalPktsSentRate = this.shadowRoot.getElementById("total-pkts-sent-per-second");
        this.acksReceivedOkRate = this.shadowRoot.getElementById("acks-received-ok-per-second");
        this.totalAcksReceivedOkRate = this.shadowRoot.getElementById("total-acks-received-ok-per-second");

        this.pktsSentRateData = [];
        this.totalPktsSentRateData = [];
        this.acksReceivedOkRateData = [];
        this.totalAcksReceivedOkRateData = [];
        this.sampleSize = 16;
        this.labelsLength = 16;
        this.labels = []; // x axis time labels
        for(let i=1; i<= this.labelsLength; i++)
            this.labels.push(i*2);
        this.nextLabel = INITIAL_NEXT_LABEL;
        this.chartCanvas = this.shadowRoot.getElementById("chart");
        Chart.defaults.global.animation.duration = 0;
        Chart.defaults.global.defaultFontColor = "#4f4f4f";
        Chart.defaults.global.elements.line.fill = false;
        Chart.defaults.global.elements.line.tension = 0;
        this._makeChart();
        window.addEventListener("resize", () => {
            // Re-render the chart
            this.chart.destroy();
            this._makeChart();
        });
    }

    _makeChart(){
        let maxTicksLimit = null;
        if(window.innerWidth <= 550){
            this.chartCanvas.height = 300;
            maxTicksLimit = 10;
        }else{
           this.chartCanvas.height = 150; 
           maxTicksLimit = 16;
        }
        this.chart = new Chart(this.chartCanvas, {
            type: "line",
            data: {
                labels: this.labels,
                datasets: [
                    {
                        label: "Total packets sent",
                        data: this.totalPktsSentRateData,
                        borderColor: "#65A2F4",
                        pointBackgroundColor: "#B2D0F9",
                    },
                    {
                        label: "Packets sent (last 2 s)",
                        data: this.pktsSentRateData,
                        borderColor: "#F96060",
                        pointBackgroundColor: "#FCB0B0",
                    },
                    {
                        label: "Total acknowledgments received ok",
                        data: this.totalAcksReceivedOkRateData,
                        borderColor: "#3AB146",
                        pointBackgroundColor: "#9CD8A2",
                    },
                    {
                        label: "Acknowledgments received ok (last 2 s)",
                        data: this.acksReceivedOkRateData,
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
     * Update the shown statistics from the data in a StatsComputer object.
     * @param {StatsComputer} stats
     */
    update(stats){
        this.pktsSent.textContent = stats.totalPktsSent;
        this.pktsReSent.textContent = stats.totalPktsReSent;
        this.pktsReceived.textContent = stats.totalPktsReceived;
        this.pktsReceivedOk.textContent = stats.totalPktsReceivedOk;
        this.acksSent.textContent = stats.totalAcksSent;
        this.acksReceived.textContent = stats.totalAcksReceived;
        this.acksReceivedOk.textContent = stats.totalAcksReceivedOk;
        this.pktsSentRate.textContent = trunc(stats.pktsSentRate, 3);
        this.totalPktsSentRate.textContent = trunc(stats.totalPktsSentRate, 3);
        this.acksReceivedOkRate.textContent = trunc(stats.acksReceivedOkRate, 3);
        this.totalAcksReceivedOkRate.textContent = trunc(stats.totalAcksReceivedOkRate, 3);

        this.totalPktsSentRateData.push(trunc(stats.totalPktsSentRate, 3));
        this.totalAcksReceivedOkRateData.push(trunc(stats.totalAcksReceivedOkRate, 3));
        this.pktsSentRateData.push(trunc(stats.pktsSentRate, 3));
        this.acksReceivedOkRateData.push(trunc(stats.acksReceivedOkRate, 3));
        if(this.totalPktsSentRateData.length > this.sampleSize){
            this.totalPktsSentRateData.shift();
            this.totalAcksReceivedOkRateData.shift();
            this.acksReceivedOkRateData.shift();
            this.pktsSentRateData.shift();
            this.labels.push(this.nextLabel);
            this.labels.shift();
            this.nextLabel += 2;
        }
        this.chart.update();
    }

    reset(){
        this.pktsSent.textContent = 0;
        this.pktsReSent.textContent = 0;
        this.pktsReceived.textContent = 0;
        this.pktsReceivedOk.textContent = 0;
        this.acksSent.textContent = 0;
        this.acksReceived.textContent = 0;
        this.acksReceivedOk.textContent = 0;
        this.pktsSentRate.textContent = 0;
        this.totalPktsSentRate.textContent = 0;
        this.acksReceivedOkRate.textContent = 0;
        this.totalAcksReceivedOkRate.textContent = 0;

        this.pktsSentRateData.splice(0, this.pktsSentRateData.length);
        this.totalPktsSentRateData.splice(0, this.totalPktsSentRateData.length);
        this.acksReceivedOkRateData.splice(0, this.acksReceivedOkRateData.length);
        this.totalAcksReceivedOkRateData.splice(0, this.totalAcksReceivedOkRateData.length);
        this.labels.splice(0, this.labels.length);
        for(let i=1; i<= this.labelsLength; i++)
            this.labels.push(i*2);
        this.nextLabel = INITIAL_NEXT_LABEL;
        this.chart.update();
    }

}