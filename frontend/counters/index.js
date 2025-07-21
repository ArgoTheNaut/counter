/**
 * UTILITIES
 */

function gid(id) { return document.getElementById(id); }

function addChildOn(node, type) {
    let child = document.createElement(type);
    node.appendChild(child);
    return child;
}

Array.prototype.average = function () {
    if (this.length === 0) return Number("undefined");
    return this.sum() / this.length;
}

Array.prototype.sum = function () {
    return this.reduce((prev, cur) => prev + cur, 0);
}

/**
 * TIME UTILITIES
 */
let MILLIS = 1;
let SECONDS = 1000 * MILLIS;
let MINUTES = 60 * SECONDS;
let HOURS = 60 * MINUTES;
let DAYS = 24 * HOURS;

function getCurrentTimezoneString(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        console.log("Failed at extracting ISO time from date", date);
        return `ERROR: ${date}`;
    }
    return new Date(date.getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split(".")[0];
}

function fromCurrentTimezoneString(str) {
    return new Date((new Date(str)).getTime() + new Date().getTimezoneOffset() * 60000);
}

/*******************
 *      MAIN
 *******************/

// tracks the latest click data retrieved from the server
let clickData = [];

async function updateCounter(category, newVal) {

    // if a category is not defined, assume the call is made for all categories and populate each one
    if (category === undefined) {
        let response = await fetch("/counter");
        clickData = await response.json();
        buttons.forEach(b => {
            updateCounter(
                b.title,
                clickData.filter(d => d.category.toLowerCase() === b.title.toLowerCase()).length,
            );
        });
        return;
    }

    if (newVal === undefined) {
        let response = await fetch("/counter");
        clickData = await response.json();
        newVal = clickData.filter(d => d.category.toLowerCase() === category.toLowerCase()).length;
    }
    // console.log(`Updating category ${category} with new count: ${newVal}`);
    gid(`${category}-num`).innerHTML = `${newVal}`;
}

async function increment(category) {
    let response = await fetch("/counter", {
        method: "post",
        headers: {
            "sentTime": Date.now(),
            "category": category,
        },
    });
    clickData = await response.json();
    let newVal = clickData.filter(d => d.category.toLowerCase() === category.toLowerCase()).length;
    updateCounter(category, newVal);
}

async function decrement(category) {
    let response = await fetch("/counter", {
        method: "delete",
        headers: {
            "category": category,
        },
    });
    clickData = await response.json();
    let newVal = clickData.filter(d => d.category.toLowerCase() === category.toLowerCase()).length;
    updateCounter(category, newVal);
}

// https://www.w3schools.com/charsets/ref_emoji_symbols.asp
// TODO: move this to a user-dependent table for more customizability user-to-user
let buttons = [
    {
        color: `rgb(150, 255, 150)`,
        title: `A`,
        icon: `&#129365;`,
        num: 0,
    },
    {
        color: `rgb(119, 196, 251)`,
        title: `B`,
        icon: `&#128167;`,
        num: 0,
    },
    {
        color: `rgb(255, 150, 180)`,
        title: `C`,
        icon: `&#129532;`,
        num: 0,
    },
    {
        color: `rgb(180, 180, 180)`,
        title: `D`,
        icon: `&#9863;`,
        num: 0,
    },
];

function renderScreen() {
    let base = gid("main-container");
    buttons.forEach(buttonData => {
        let switchBase = addChildOn(base, "table");
        switchBase.classList.add("increment-switch");
        switchBase.classList.add("tile");
        switchBase.style.backgroundColor = buttonData.color;

        // core structure
        let incrementBtnTr = addChildOn(switchBase, "tr");
        let contentTr = addChildOn(switchBase, "tr");
        let decrementBtnTr = addChildOn(switchBase, "tr");

        // +1 button
        let incBtn = addChildOn(incrementBtnTr, "button");
        incBtn.classList.add("delta-button");
        incBtn.style.backgroundColor = buttonData.color;
        incBtn.innerHTML = "+1";
        incBtn.addEventListener("click", () => { increment(buttonData.title) });

        // -1 button
        let decBtn = addChildOn(decrementBtnTr, "button");
        decBtn.classList.add("delta-button");
        decBtn.style.backgroundColor = buttonData.color;
        decBtn.innerHTML = "-1";
        decBtn.addEventListener("click", () => { decrement(buttonData.title) });

        // core
        let contentCore = addChildOn(contentTr, "div");
        let contentLabel = addChildOn(contentCore, "div");
        contentLabel.innerHTML = buttonData.title;

        let contentBottom = addChildOn(contentCore, "div");
        let bottomTable = addChildOn(contentBottom, "table");
        let bottomTr = addChildOn(bottomTable, "tr");
        let bottomIcon = addChildOn(bottomTr, "td");
        let bottomNum = addChildOn(bottomTr, "td");

        bottomTable.classList.add("same-width-table");
        contentLabel.classList.add("switch-contents");
        bottomIcon.classList.add("switch-contents");
        bottomIcon.classList.add("same-width-td");
        bottomNum.classList.add("switch-contents");
        bottomNum.classList.add("same-width-td");

        bottomIcon.innerHTML = buttonData.icon;
        bottomNum.innerHTML = buttonData.num;
        bottomNum.id = `${buttonData.title}-num`;
    });
}

async function onLoad() {
    renderScreen();
    updateCounter();
    
    // in case multiple sessions are connected, "long" poll to keep them up to date
    // TODO: switch to web sockets
    setInterval(updateCounter, 30 * SECONDS);   
}

onLoad();
