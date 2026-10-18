
const shiftForm = document.getElementById("shiftForm");
const shiftEmployee = document.getElementById("shiftEmployee");
const shiftDate = document.getElementById("shiftDate");
const shiftStart = document.getElementById("shiftStart");
const shiftEnd = document.getElementById("shiftEnd");

const weekCalendar = document.getElementById("weekCalendar");
const weekLabel = document.getElementById("weekLabel");
const selectedDayLabel = document.getElementById("selectedDayLabel");
const shiftList = document.getElementById("shiftList");
const shiftCount = document.getElementById("shiftCount");

const totalShifts = document.getElementById("totalShifts");
const totalHours = document.getElementById("totalHours");
const workingEmployees = document.getElementById("workingEmployees");

let employees = JSON.parse(localStorage.getItem("employees") || "[]");
let shifts = JSON.parse(localStorage.getItem("shifts") || "[]");

const days = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday"
];

let selectedDate = getDateString(new Date());
let currentWeek = getMonday(new Date());

// Format a date as YYYY-MM-DD
function getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
}

function parseDate(dateString) {
    const parts = dateString.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Find Monday for the selected week
function getMonday(date) {
    const monday = new Date(date);
    const day = monday.getDay();

    monday.setDate(monday.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    return monday;
}

// Save rota changes
function saveShifts() {
    localStorage.setItem("shifts", JSON.stringify(shifts));
}

// Load employees into the dropdown
function loadEmployees() {
    employees = JSON.parse(localStorage.getItem("employees") || "[]");

    shiftEmployee.innerHTML =
        '<option value="">Select an employee</option>';

    employees.forEach(function(employee, index) {
        const option = document.createElement("option");

        option.value = index;
        option.textContent = employee.name + " - " + employee.position;

        shiftEmployee.appendChild(option);
    });
}

// Work out shift length in hours
function calculateHours(start, end) {
    const startParts = start.split(":").map(Number);
    const endParts = end.split(":").map(Number);

    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];

    return (endMinutes - startMinutes) / 60;
}

// Display the weekly calendar
function displayCalendar() {
    weekCalendar.innerHTML = "";

    const sunday = new Date(currentWeek);
    sunday.setDate(sunday.getDate() + 6);

    weekLabel.textContent =
        currentWeek.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short"
        }) + " - " +
        sunday.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });

    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeek);
        date.setDate(date.getDate() + i);

        const dateString = getDateString(date);

        const dayShifts = shifts.filter(function(shift) {
            return shift.date === dateString;
        });

        const button = document.createElement("button");
        button.type = "button";
        button.className = "calendar-day";

        if (dateString === selectedDate) {
            button.classList.add("selected");
        }

        button.innerHTML =
            "<span>" + days[date.getDay()].slice(0, 3) + "</span>" +
            "<strong>" + date.getDate() + "</strong>" +
            "<small>" + dayShifts.length + " shifts</small>";

        button.addEventListener("click", function() {
            selectedDate = dateString;
            shiftDate.value = selectedDate;

            displayCalendar();
            displayShifts();
        });

        weekCalendar.appendChild(button);
    }

    updateSummary();
}

// Display shifts for the selected day
function displayShifts() {
    shiftList.innerHTML = "";

    const date = parseDate(selectedDate);

    selectedDayLabel.textContent =
        date.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });

    const dayShifts = shifts
        .map(function(shift, index) {
            return { shift: shift, index: index };
        })
        .filter(function(item) {
            return item.shift.date === selectedDate;
        })
        .sort(function(a, b) {
            return a.shift.start.localeCompare(b.shift.start);
        });

    shiftCount.textContent =
        dayShifts.length + (dayShifts.length === 1 ? " shift" : " shifts");

    if (dayShifts.length === 0) {
        const message = document.createElement("p");
        message.className = "muted";
        message.textContent = "No shifts scheduled for this day.";
        shiftList.appendChild(message);
        return;
    }

    dayShifts.forEach(function(item) {
        const shift = item.shift;

        const card = document.createElement("div");
        card.className = "shift-card";

        const details = document.createElement("div");

        const name = document.createElement("h3");
        name.textContent = shift.employeeName;

        const information = document.createElement("p");
        information.className = "muted";
        information.textContent =
            shift.position + " | " +
            shift.start + " - " + shift.end;

        details.appendChild(name);
        details.appendChild(information);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "secondary-button";
        deleteButton.textContent = "Remove";

        deleteButton.addEventListener("click", function() {
            deleteShift(item.index);
        });

        card.appendChild(details);
        card.appendChild(deleteButton);

        shiftList.appendChild(card);
    });
}

// Calculate the weekly totals
function updateSummary() {
    const endOfWeek = new Date(currentWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const startDate = getDateString(currentWeek);
    const endDate = getDateString(endOfWeek);

    const weeklyShifts = shifts.filter(function(shift) {
        return shift.date >= startDate && shift.date <= endDate;
    });

    let hours = 0;
    const employeeNames = new Set();

    weeklyShifts.forEach(function(shift) {
        hours += calculateHours(shift.start, shift.end);
        employeeNames.add(shift.employeeName);
    });

    totalShifts.textContent = weeklyShifts.length;
    totalHours.textContent = hours.toFixed(1) + " hrs";
    workingEmployees.textContent = employeeNames.size;
}

// Add a shift
shiftForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const employeeIndex = shiftEmployee.value;
    const date = shiftDate.value;
    const start = shiftStart.value;
    const end = shiftEnd.value;

    if (employeeIndex === "") {
        alert("Please select an employee.");
        return;
    }

    if (!date || !start || !end) {
        alert("Please complete all shift details.");
        return;
    }

    if (start >= end) {
        alert("Finish time must be later than start time.");
        return;
    }

    const employee = employees[Number(employeeIndex)];

    if (!employee) {
        alert("Employee not found.");
        return;
    }

    const dayName = days[parseDate(date).getDay()];

    // Check employee availability
    const availability = employee.availability || {};
    const availableDay = availability[dayName];

    if (!availableDay) {
        alert(employee.name + " is not available on " + dayName + ".");
        return;
    }

    if (start < availableDay.startTime ||
        end > availableDay.endTime) {
        alert("This shift is outside " + employee.name +
              "'s available hours.");
        return;
    }

    // Check for overlapping shifts
    const overlapping = shifts.some(function(shift) {
        return shift.employeeName === employee.name &&
               shift.date === date &&
               start < shift.end &&
               end > shift.start;
    });

    if (overlapping) {
        alert("This employee already has a shift during these hours.");
        return;
    }

    // Check weekly scheduled hours
    const monday = getMonday(parseDate(date));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const weekStart = getDateString(monday);
    const weekEnd = getDateString(sunday);

    let weeklyHours = 0;

    shifts.forEach(function(shift) {
        if (shift.employeeName === employee.name &&
            shift.date >= weekStart &&
            shift.date <= weekEnd) {
            weeklyHours += calculateHours(shift.start, shift.end);
        }
    });

    const newHours = calculateHours(start, end);

    if (weeklyHours + newHours > 40) {
        alert("This shift would exceed ShiftHub's 40-hour weekly limit.");
        return;
    }

    const newShift = {
        employeeName: employee.name,
        position: employee.position,
        date: date,
        start: start,
        end: end
    };

    shifts.push(newShift);

    saveShifts();

    selectedDate = date;
    currentWeek = getMonday(parseDate(date));

    displayCalendar();
    displayShifts();

    shiftForm.reset();
    shiftDate.value = selectedDate;

    alert("Shift added for " + employee.name + "!");
});

// Remove a shift
function deleteShift(index) {
    const shift = shifts[index];

    if (!confirm("Remove this shift for " + shift.employeeName + "?")) {
        return;
    }

    shifts.splice(index, 1);
    saveShifts();

    displayCalendar();
    displayShifts();
}

// Previous week
document.getElementById("prevWeek").addEventListener("click", function() {
    currentWeek.setDate(currentWeek.getDate() - 7);
    selectedDate = getDateString(currentWeek);
    shiftDate.value = selectedDate;

    displayCalendar();
    displayShifts();
});

// Next week
document.getElementById("nextWeek").addEventListener("click", function() {
    currentWeek.setDate(currentWeek.getDate() + 7);
    selectedDate = getDateString(currentWeek);
    shiftDate.value = selectedDate;

    displayCalendar();
    displayShifts();
});

// Return to the current week
document.getElementById("todayButton").addEventListener("click", function() {
    selectedDate = getDateString(new Date());
    currentWeek = getMonday(new Date());
    shiftDate.value = selectedDate;

    displayCalendar();
    displayShifts();
});

// Load the rota page
loadEmployees();
shiftDate.value = selectedDate;
displayCalendar();
displayShifts();
