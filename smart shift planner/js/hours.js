
const weekDateInput = document.getElementById("weekDate");
const weekLabel = document.getElementById("weekLabel");
const hoursTableBody = document.getElementById("hoursTableBody");

function loadSavedData(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Unable to load " + key, error);
        return [];
    }
}

function dateFromString(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function toDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getMonday(date) {
    const monday = new Date(date);
    const day = (monday.getDay() + 6) % 7;

    monday.setDate(monday.getDate() - day);
    monday.setHours(0, 0, 0, 0);

    return monday;
}

function formatDate(date) {
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// Convert shift date and time into a real Date
function getShiftDateTime(date, time) {
    const result = dateFromString(date);
    const [hours, minutes] = time.split(":").map(Number);

    result.setHours(hours, minutes, 0, 0);
    return result;
}

// Calculate the hours that fall inside the selected week
function hoursWithinWeek(shift, monday, nextMonday) {
    if (!shift.date || !shift.start || !shift.end) {
        return 0;
    }

    const start = getShiftDateTime(shift.date, shift.start);
    const end = getShiftDateTime(shift.date, shift.end);

    // A shift ending earlier than it starts is overnight
    if (end <= start) {
        end.setDate(end.getDate() + 1);
    }

    const overlapStart = Math.max(
        start.getTime(),
        monday.getTime()
    );

    const overlapEnd = Math.min(
        end.getTime(),
        nextMonday.getTime()
    );

    return Math.max(0, overlapEnd - overlapStart) / 3600000;
}

function formatHours(value) {
    return value.toFixed(2) + " hrs";
}

function renderHours() {
    const employees = loadSavedData("employees");
    const shifts = loadSavedData("shifts");

    const selectedDate = dateFromString(weekDateInput.value);
    const monday = getMonday(selectedDate);

    const nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);

    const sunday = new Date(nextMonday);
    sunday.setDate(sunday.getDate() - 1);

    weekLabel.textContent =
        `${formatDate(monday)} - ${formatDate(sunday)}`;

    hoursTableBody.innerHTML = "";

    if (employees.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent =
            "No employees found. Add employees first.";
        row.appendChild(cell);
        hoursTableBody.appendChild(row);
        return;
    }

    employees.forEach(function(employee) {
        const contracted = Number(employee.contractedHours) || 0;

        let scheduled = 0;

        shifts.forEach(function(shift) {
            if (shift.employeeName === employee.name) {
                scheduled += hoursWithinWeek(
                    shift,
                    monday,
                    nextMonday
                );
            }
        });

        const remaining = Math.max(0, contracted - scheduled);
        const aboveContract = Math.max(0, scheduled - contracted);

        const row = document.createElement("tr");

        const values = [
            employee.name,
            employee.position,
            formatHours(contracted),
            formatHours(scheduled),
            formatHours(remaining),
            formatHours(aboveContract)
        ];

        values.forEach(function(value, index) {
            const cell = document.createElement("td");
            cell.textContent = value;

            if (index === 5 && aboveContract > 0) {
                cell.classList.add("hours-warning");
            }

            row.appendChild(cell);
        });

        hoursTableBody.appendChild(row);
    });
}

// Start on the current week
weekDateInput.value = toDateString(new Date());

weekDateInput.addEventListener("change", renderHours);

renderHours();
