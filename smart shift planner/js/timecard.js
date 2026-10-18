
const clockTimer = document.getElementById("clockTimer");
const clockStatus = document.getElementById("clockStatus");
const clockMessage = document.getElementById("clockMessage");

const clockInButton = document.getElementById("clockInButton");
const clockOutButton = document.getElementById("clockOutButton");

const lastShift = document.getElementById("lastShift");

const timecardHistoryBody = document.getElementById(
    "timecardHistoryBody"
);

const totalWorkedHours = document.getElementById(
    "totalWorkedHours"
);

// Load saved data
let clockInTime = localStorage.getItem("clockInTime");

let timecards;

try {
    const savedTimecards = JSON.parse(
        localStorage.getItem("timecards") || "[]"
    );

    timecards = Array.isArray(savedTimecards)
        ? savedTimecards
        : [];

} catch (error) {
    console.error("Unable to load timecards:", error);
    timecards = [];
}

// Format elapsed time as HH:MM:SS
function formatTime(milliseconds) {
    const seconds = Math.floor(
        Math.max(0, milliseconds) / 1000
    );

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return [hours, minutes, remainingSeconds]
        .map(number => String(number).padStart(2, "0"))
        .join(":");
}

// Format clock-in and clock-out times
function formatClockTime(date) {
    return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

// Update the running timer
function updateTimer() {
    if (clockInTime !== null) {
        const timeWorked = Date.now() - Number(clockInTime);

        clockTimer.textContent = formatTime(timeWorked);
    }
}

// Update clock status and buttons
function updateStatus() {
    const working = clockInTime !== null;

    clockStatus.textContent = working
        ? "Clocked In"
        : "Clocked Out";

    clockInButton.disabled = working;
    clockOutButton.disabled = !working;

    clockStatus.style.color = working
        ? "#16803d"
        : "#697487";
}

// Clock In
clockInButton.addEventListener("click", function() {
    if (clockInTime !== null) {
        return;
    }

    clockInTime = String(Date.now());

    localStorage.setItem("clockInTime", clockInTime);

    clockTimer.textContent = "00:00:00";

    clockMessage.textContent = "You are now clocked in.";

    updateStatus();
    updateTimer();
});

// Clock Out
clockOutButton.addEventListener("click", function() {
    if (clockInTime === null) {
        return;
    }

    const start = Number(clockInTime);
    const finish = Date.now();

    const timeWorked = finish - start;

    const timecard = {
        clockIn: new Date(start).toISOString(),
        clockOut: new Date(finish).toISOString(),
        hoursWorked: timeWorked / 3600000
    };

    timecards.push(timecard);

    // Save completed timecard
    localStorage.setItem(
        "timecards",
        JSON.stringify(timecards)
    );

    localStorage.removeItem("clockInTime");

    clockInTime = null;

    clockTimer.textContent = formatTime(timeWorked);

    clockMessage.textContent = "You have clocked out.";

    updateStatus();
    displayLastShift();
    displayTimecardHistory();
});

// Display latest completed shift
function displayLastShift() {
    if (timecards.length === 0) {
        lastShift.textContent = "No completed shifts yet.";
        return;
    }

    const shift = timecards[timecards.length - 1];

    const start = new Date(shift.clockIn);
    const finish = new Date(shift.clockOut);

    lastShift.textContent =
        start.toLocaleDateString("en-GB") + " | " +
        formatClockTime(start) + " - " +
        formatClockTime(finish) + " | " +
        Number(shift.hoursWorked).toFixed(2) + " hours";
}

// Display all previous timecards
function displayTimecardHistory() {
    timecardHistoryBody.innerHTML = "";

    if (timecards.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = "No timecards recorded yet.";

        row.appendChild(cell);
        timecardHistoryBody.appendChild(row);

        totalWorkedHours.textContent =
            "Total recorded hours: 0.00 hrs";

        return;
    }

    let totalHours = 0;

    // Display newest shifts first
    const sortedTimecards = [...timecards].sort(function(a, b) {
        return new Date(b.clockIn) - new Date(a.clockIn);
    });

    sortedTimecards.forEach(function(shift) {
        const start = new Date(shift.clockIn);
        const finish = new Date(shift.clockOut);

        const hours = Number(shift.hoursWorked) || 0;

        totalHours += hours;

        const row = document.createElement("tr");

        const values = [
            start.toLocaleDateString("en-GB"),
            formatClockTime(start),
            formatClockTime(finish),
            hours.toFixed(2) + " hrs"
        ];

        values.forEach(function(value) {
            const cell = document.createElement("td");

            cell.textContent = value;
            row.appendChild(cell);
        });

        timecardHistoryBody.appendChild(row);
    });

    totalWorkedHours.textContent =
        "Total recorded hours: " +
        totalHours.toFixed(2) +
        " hrs";
}

// Load saved status and timecards
updateStatus();
displayLastShift();
displayTimecardHistory();

if (clockInTime !== null) {
    updateTimer();
}

// Update running timer every second
setInterval(updateTimer, 1000);
