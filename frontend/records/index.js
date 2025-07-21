/**
 * UTILITIES
 */

function gid(id) { return document.getElementById(id); }

function addChildOn(node, type) {
    let child = document.createElement(type);
    node.appendChild(child);
    return child;
}

/**
 * TIME UTILITIES
 */

// js time units
let MILLIS = 1;
let SECONDS = 1000 * MILLIS;
let MINUTES = 60 * SECONDS;
let HOURS = 60 * MINUTES;
let DAYS = 24 * HOURS;

let times = {};
times["ms"] = 1;
times["s"] = times["ms"] * 1000;
times["min"] = times["s"] * 60;
times["hour"] = times["min"] * 60;
times["day"] = times["hour"] * 24;

function parseInterval() {
    try {
        let [mag, unit] = document.getElementById("interval").value.split("-");
        mag = Number(mag);
        unit = Number(times[unit]);
        return mag * unit;
    } catch (error) {
        console.error(error);
        console.log("Failed to parse interval:", document.getElementById("interval"));
        return times["hour"]; // some safe default in case of failure
    }
}

function getCurrentTimezoneString(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        console.log("Failed at extracting ISO time from date", date);
        return `ERROR: ${date}`;
    }
    return new Date(date.getTime()).toLocaleString('sv');
}

function dateInEst(date) {
    return new Date(new Date(date).getTime() + new Date().getTimezoneOffset() * MINUTES);
}


/**
 * Converts Date to [0,24) float of hours
 * @param {Date} date 
 */
function dateModDay(date, rounding = 1000) {
    let d = new Date(date);
    let ms = d.getHours() * HOURS + d.getMinutes() * MINUTES + d.getSeconds() * SECONDS;
    return Math.round(ms / HOURS * rounding) / rounding;
}

/**
 * MAIN
 */

let data;

let tableConfig = {
    startTime: 14 * HOURS, // 2pm on the day modulo
    interval: 5 * MINUTES,
};

async function loadGraph() {
    await downloadData();
    await drawGraphs();
}

async function downloadData() {
    let queryParams = {
        start: (new Date(document.getElementById("start-time").value)).getTime(),
        end: (new Date(document.getElementById("end-time").value)).getTime(),
    };

    let query = "?" + Object.keys(queryParams).map(k => `${k}=${queryParams[k]}`).join("&");

    let url = "/counter";
    let response = await fetch(url + query);
    dataPoints = await response.json();
    console.log(dataPoints);
    data = dataPoints.map(d => new Date(d.server_submission_time)).sort();
}

function prepareTable() {
    let table = gid("timeTable");
    table.replaceChildren();
    let trTimes = addChildOn(table, "tr");

    // Allows dates to have a spot in lower rows
    let spacer = addChildOn(trTimes, "td");
    spacer.innerHTML = "Date";
    let count = addChildOn(trTimes, "td");
    count.innerHTML = "Total";

    let timestamps = data.map(d => dateModDay(d, 1 * HOURS) * HOURS);
    let maxTs = timestamps.sort()[timestamps.length - 1];
    for (let block = tableConfig.startTime; block <= maxTs; block += tableConfig.interval) {
        let timeStr = dateInEst(new Date(block)).toLocaleTimeString('sv').split(":").slice(0, 2).join(":");
        let tdt = addChildOn(trTimes, "td");
        tdt.innerHTML = timeStr;
    }
}

async function drawGraphs() {
    tableConfig.interval = parseInterval();
    document.getElementById("plotRoot").replaceChildren();
    prepareTable();

    let dates = {};
    data.map(d => getCurrentTimezoneString(d).split(" ")[0]).map(d => dates[d] = true);

    Object.keys(dates)
        .sort()
        .forEach(day => {
            let id = `dataPoints_${day}`;
            let dayData = data.filter(t => dateInEst(day).getTime() < t.getTime() && t.getTime() < dateInEst(day).getTime() + 1 * DAYS);
            createDiv(id);
            drawDataTableRow(day, dayData);
            defaultPlot(dayData, id);
        });

    colorTableEntries();
}

function createDiv(id) {
    let parent = document.getElementById("plotRoot");
    let dateDiv = document.createElement("div");
    dateDiv.id = `date-${id}`;
    dateDiv.innerHTML = id.split("_")[1];
    dateDiv.classList.add("day-layer");

    let newDiv = document.createElement("div");
    newDiv.id = id;

    let trailingLogDiv = document.createElement("div");
    trailingLogDiv.id = "trailingLog" + id.split("_")[1];

    let horizontalLine = document.createElement("hr");

    parent.appendChild(dateDiv);
    dateDiv.appendChild(newDiv);
    dateDiv.appendChild(trailingLogDiv);
    dateDiv.appendChild(horizontalLine);

    return {
        dateDiv: dateDiv,
        trailingLogDiv: trailingLogDiv,
    };
}

function startupReset() {
    let startElem = document.getElementById("start-time");
    let endElem = document.getElementById("end-time");
    startElem.value = (new Date(Date.now() - 30 * DAYS)).toLocaleDateString('sv') + " 00:00:00";
    endElem.value = (new Date(Date.now() + 1 * DAYS)).toLocaleDateString('sv') + " 00:00:00";
    startElem.addEventListener("change", loadGraph);
    endElem.addEventListener("change", loadGraph);
}

function drawDataTableRow(day, data) {
    let table = gid("timeTable");

    let trCount = addChildOn(table, "tr");

    // Row label
    addChildOn(trCount, "td").innerHTML = day;
    addChildOn(trCount, "td").innerHTML = data.length;

    let timestamps = data.map(d => dateModDay(d, 1 * HOURS) * HOURS);
    let endTime = timestamps[timestamps.length - 1]; // assumes the data is already sorted
    for (let block = tableConfig.startTime; block <= endTime; block += tableConfig.interval) {
        let instances = timestamps.filter(t => block <= t && t < block + tableConfig.interval).length;

        let tdc = addChildOn(trCount, "td");
        tdc.classList.add("data-entry-heatmap");

        tdc.innerHTML = instances;
    }
}

function colorTableEntries() {
    let tds = [...document.getElementsByClassName("data-entry-heatmap")];
    let min = 0;
    let max = tds.map(td => Number(td.innerHTML)).sort()[tds.length - 1];
    console.log("Range:", min, max);
    let rMin = 255, gMin = 255, bMin = 255; // starting color
    let rMax = 150, gMax = 255, bMax = 150; // ending color
    tds.forEach(td => {
        let num = Number(td.innerHTML);
        let gradientPoint = (num - min) / (max - min);
        let r = rMax * gradientPoint + rMin * (1 - gradientPoint);
        let g = gMax * gradientPoint + gMin * (1 - gradientPoint);
        let b = bMax * gradientPoint + bMin * (1 - gradientPoint);
        let result = `rgb(${r}, ${g}, ${b})`;
        // console.log(`Result for ${num}: ${result}`);
        td.style.backgroundColor = result;
    });
}

function defaultPlot(data, id = "appUsagePlot") {
    console.log("Plotting data:", data);
    const traces = [
        {
            x: data,
            type: "histogram",
            xbins: {
                size: tableConfig.interval,
            },
        },
    ];

    Plotly.newPlot(id, traces);
}
