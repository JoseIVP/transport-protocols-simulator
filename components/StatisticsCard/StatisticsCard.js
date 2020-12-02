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
        this.pktsSentPerSecond = this.shadowRoot.getElementById("pkts-sent-per-second");
        this.totalPktsSentPerSecond = this.shadowRoot.getElementById("total-pkts-sent-per-second");
        this.acksReceivedOkPerSecond = this.shadowRoot.getElementById("acks-received-ok-per-second");
        this.totalAcksReceivedOkPerSecond = this.shadowRoot.getElementById("total-acks-received-ok-per-second");

        this.pktsSentPerSecondData = [];
        this.totalPktsSentPerSecondData = [];
        this.acksReceivedOkPerSecondData = [];
        this.totalAcksReceivedOkPerSecondData = [];
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
                        data: this.totalPktsSentPerSecondData,
                        borderColor: "#65A2F4",
                        pointBackgroundColor: "#B2D0F9",
                    },
                    {
                        label: "Packets sent (last 2 s)",
                        data: this.pktsSentPerSecondData,
                        borderColor: "#F96060",
                        pointBackgroundColor: "#FCB0B0",
                    },
                    {
                        label: "Total acknowledgments received ok",
                        data: this.totalAcksReceivedOkPerSecondData,
                        borderColor: "#3AB146",
                        pointBackgroundColor: "#9CD8A2",
                    },
                    {
                        label: "Acknowledgments received ok (last 2 s)",
                        data: this.acksReceivedOkPerSecondData,
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

        this.totalPktsSentPerSecondData.push(trunc(stats.totalPacketsSentPerSecond, 3));
        this.totalAcksReceivedOkPerSecondData.push(trunc(stats.totalAcksReceivedOkPerSecond, 3));
        this.pktsSentPerSecondData.push(trunc(stats.packetsSentPerSecond, 3));
        this.acksReceivedOkPerSecondData.push(trunc(stats.acksReceivedOkPerSecond, 3));
        if(this.totalPktsSentPerSecondData.length > this.sampleSize){
            this.totalPktsSentPerSecondData.shift();
            this.totalAcksReceivedOkPerSecondData.shift();
            this.acksReceivedOkPerSecondData.shift();
            this.pktsSentPerSecondData.shift();
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
        this.pktsSentPerSecond.textContent = 0;
        this.totalPktsSentPerSecond.textContent = 0;
        this.acksReceivedOkPerSecond.textContent = 0;
        this.totalAcksReceivedOkPerSecond.textContent = 0;

        this.pktsSentPerSecondData.splice(0, this.pktsSentPerSecondData.length);
        this.totalPktsSentPerSecondData.splice(0, this.totalPktsSentPerSecondData.length);
        this.acksReceivedOkPerSecondData.splice(0, this.acksReceivedOkPerSecondData.length);
        this.totalAcksReceivedOkPerSecondData.splice(0, this.totalAcksReceivedOkPerSecondData.length);
        this.labels.splice(0, this.labels.length);
        for(let i=1; i<= this.labelsLength; i++)
            this.labels.push(i*2);
        this.nextLabel = INITIAL_NEXT_LABEL;
        this.chart.update();
    }

}