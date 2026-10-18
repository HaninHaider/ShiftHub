
const coverShift = document.getElementById("coverShift");
const findCoverButton = document.getElementById("findCoverButton");
const coverResults = document.getElementById("coverResults");

const dayNames = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday"
];

let employees = [];
let shifts = [];

function loadData() {
    try {
        employees = JSON.parse(
            localStorage.getItem("employees") || "[]"
        );

        shifts = JSON.parse(
            localStorage.getItem("shifts") || "[]"
        );

        if (!Array.isArray(employees)) employees = [];
        if (!Array.isArray(shifts)) shifts = [];

    } catch (error) {
        console.error("Unable to load data:", error);
        employees = [];
        shifts = [];
    }
}

function readArray(key) {
    try {
        const data = JSON.parse(
            localStorage.getItem(key) || "[]"
        );

        return Array.isArray(data) ? data : [];

    } catch (error) {
        console.error("Unable to load " + key, error);
        return [];
    }
}

function parseDate(dateString) {
    const [year, month, day] =
        dateString.split("-").map(Number);

    return new Date(year, month - 1, day);
}

function minutes(time) {
    const [hours, mins] = time.split(":").map(Number);
    return hours * 60 + mins;
}

function shiftStart(shift) {
    const date = parseDate(shift.date);
    date.setMinutes(minutes(shift.start));
    return date.getTime();
}

function shiftEnd(shift) {
    const date = parseDate(shift.date);
    date.setMinutes(minutes(shift.end));
    return date.getTime();
}

function shiftHours(shift) {
    return (
        minutes(shift.end) - minutes(shift.start)
    ) / 60;
}

function weekStart(dateString) {
    const date = parseDate(dateString);

    const day = (date.getDay() + 6) % 7;

    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);

    return date.getTime();
}

// Identify shifts used in swap offers and requests
function shiftKey(shift) {
    return [
        shift.employeeName,
        shift.date,
        shift.start,
        shift.end
    ].join("|");
}

// Prevent assignment while a shift is involved
// in an active swap offer or request
function isInActiveSwap(target) {
    const offers = readArray("swapOffers");
    const requests = readArray("swapRequests");

    const targetKey = shiftKey(target);

    const activeRequests = requests.filter(function(request) {
        return (
            request.status === "requested" ||
            request.status === "pending_manager"
        );
    });

    const activeOfferIds = new Set(
        activeRequests.map(request => request.offerId)
    );

    const offeredShiftLocked = offers.some(function(offer) {
        return (
            offer.shiftKey === targetKey &&
            (
                offer.status === "open" ||
                offer.status === "reserved" ||
                activeOfferIds.has(offer.id)
            )
        );
    });

    const requestedShiftLocked = activeRequests.some(
        function(request) {
            return request.requesterShiftKey === targetKey;
        }
    );

    return offeredShiftLocked || requestedShiftLocked;
}

// Fill the dropdown with scheduled shifts
function loadShifts() {
    loadData();

    coverShift.innerHTML =
        '<option value="">Select a shift</option>';

    shifts.forEach(function(shift, index) {
        const option = document.createElement("option");

        option.value = index;

        option.textContent =
            shift.employeeName + " | " +
            shift.date + " | " +
            shift.start + " - " + shift.end;

        coverShift.appendChild(option);
    });
}

// Check whether an employee can cover a shift
function checkEmployee(employee, target) {
    const reasons = [];

    if (employee.name === target.employeeName) {
        reasons.push("Already assigned to this shift");
    }

    if (employee.position !== target.position) {
        reasons.push("Position does not match");
    }

    // This version only assigns same-day shifts
    if (
        !target.start ||
        !target.end ||
        target.start >= target.end
    ) {
        reasons.push(
            "Overnight or invalid shift requires review"
        );
    }

    if (
        employee.ageCategory !== "under18" &&
        employee.ageCategory !== "adult"
    ) {
        reasons.push("Employee age category is missing");
    }

    // Check availability
    const date = parseDate(target.date);
    const dayName = dayNames[date.getDay()];

    const available = employee.availability?.[dayName];

    if (!available) {
        reasons.push("Not available on " + dayName);

    } else if (
        target.start < available.startTime ||
        target.end > available.endTime
    ) {
        reasons.push("Outside available hours");
    }

    const start = shiftStart(target);
    const end = shiftEnd(target);

    const requiredRest =
        employee.ageCategory === "under18" ? 12 : 11;

    const employeeShifts = shifts.filter(function(shift) {
        return shift.employeeName === employee.name;
    });

    // Check overlaps and rest periods
    for (const shift of employeeShifts) {
        if (shift.start >= shift.end) {
            reasons.push(
                "Existing overnight shift requires review"
            );
            continue;
        }

        const otherStart = shiftStart(shift);
        const otherEnd = shiftEnd(shift);

        if (start < otherEnd && end > otherStart) {
            reasons.push("Overlapping shift");
        }

        const restBefore = (start - otherEnd) / 3600000;
        const restAfter = (otherStart - end) / 3600000;

        if (
            (restBefore >= 0 &&
             restBefore < requiredRest) ||
            (restAfter >= 0 &&
             restAfter < requiredRest)
        ) {
            reasons.push("Insufficient rest between shifts");
        }
    }

    // Check scheduled weekly hours
    const monday = weekStart(target.date);

    let weeklyHours = 0;

    employeeShifts.forEach(function(shift) {
        if (weekStart(shift.date) === monday) {
            weeklyHours += Math.max(0, shiftHours(shift));
        }
    });

    const newHours = weeklyHours +
        Math.max(0, shiftHours(target));

    if (newHours > 40) {
        reasons.push("Exceeds the 40-hour weekly limit");
    }

    // Additional checks for under-18 employees
    if (employee.ageCategory === "under18") {
        let dailyHours = Math.max(0, shiftHours(target));

        employeeShifts.forEach(function(shift) {
            if (shift.date === target.date) {
                dailyHours += Math.max(
                    0,
                    shiftHours(shift)
                );
            }
        });

        if (dailyHours > 8) {
            reasons.push("Exceeds 8 hours in one day");
        }

        // Young-worker night rules need more checks.
        // Block automatic assignment until reviewed.
        reasons.push(
            "Under-18 cover requires additional review"
        );
    }

    // Prevent cover assignment to shifts in swaps
    if (isInActiveSwap(target)) {
        reasons.push(
            "Shift is involved in an active swap"
        );
    }

    return {
        employee: employee,
        suitable: reasons.length === 0,
        reasons: [...new Set(reasons)],
        weeklyHours: newHours
    };
}

// Assign cover to a suitable employee
function assignCover(employeeName, shiftIndex) {
    // Reload the latest saved data before changing it
    loadData();

    const target = shifts[shiftIndex];

    if (!target) {
        alert("This shift no longer exists.");
        loadShifts();
        coverResults.innerHTML = "";
        return;
    }

    const employee = employees.find(function(item) {
        return item.name === employeeName;
    });

    if (!employee) {
        alert("Employee not found.");
        return;
    }

    // Run eligibility checks again
    const result = checkEmployee(employee, target);

    if (!result.suitable) {
        alert(
            "Cannot assign this employee:\n\n" +
            result.reasons.join("\n")
        );

        return;
    }

    const originalEmployee = target.employeeName;

    const confirmed = confirm(
        "Assign " + employeeName +
        " to the shift on " + target.date +
        " from " + target.start +
        " to " + target.end + "?\n\n" +
        "This will replace " + originalEmployee +
        " on the rota."
    );

    if (!confirmed) {
        return;
    }

// Give the shift to the employee covering it
    target.employeeName = employee.name;

    // Save the updated rota
    localStorage.setItem(
        "shifts",
        JSON.stringify(shifts)
    );

    alert(
        "Cover assigned successfully!\n\n" +
        employee.name + " is now scheduled for " +
        target.date + "."
    );

    // Refresh the dropdown and clear old results
    loadShifts();
    coverShift.value = "";
    coverResults.innerHTML = "";
}

// show suitable and unsuitable employees
function showResults(results, shiftIndex) {
    coverResults.innerHTML = "";

    if (results.length === 0) {
        const message = document.createElement("p");

        message.textContent =
            "No employees have been added yet.";

        coverResults.appendChild(message);
        return;
    }

    // shows the mostSuitable employees first
    results.sort(function(a, b) {
        if (a.suitable !== b.suitable) {
            return a.suitable ? -1 : 1;
        }

        return a.weeklyHours - b.weeklyHours;
    });

    results.forEach(function(result) {
        const card = document.createElement("div");

        card.className = "shift-card";
        card.style.marginBottom = "12px";

        const details = document.createElement("div");

        const name = document.createElement("h3");
        name.textContent = result.employee.name;

        const position = document.createElement("p");
        position.className = "muted";
        position.textContent = result.employee.position;

        const status = document.createElement("p");

        if (result.suitable) {
            status.textContent =
                "Suitable - " +
                result.weeklyHours.toFixed(1) +
                " scheduled hours including cover";

            status.style.color = "#16803d";

        } else {
            status.textContent = result.reasons.join(", ");
            status.style.color = "#b42335";
        }

        details.appendChild(name);
        details.appendChild(position);
        details.appendChild(status);

        card.appendChild(details);

        // Only let employees who are available take the shift
        if (result.suitable) {
            const assignButton =
                document.createElement("button");

            assignButton.type = "button";
            assignButton.className = "secondary-button";

            assignButton.textContent = "Assign Cover";

            assignButton.addEventListener(
                "click",
                function() {
                    assignCover(
                        result.employee.name,
                        shiftIndex
                    );
                }
            );

            card.appendChild(assignButton);
        }

        coverResults.appendChild(card);
    });
}

// Find cover
findCoverButton.addEventListener("click", function() {
    loadData();

    const selectedIndex = coverShift.value;

    if (selectedIndex === "") {
        alert("Please select a shift.");
        return;
    }

    const shiftIndex = Number(selectedIndex);
    const target = shifts[shiftIndex];

    if (!target) {
        alert("Shift not found. Refresh the page.");
        return;
    }

    const results = employees.map(function(employee) {
        return checkEmployee(employee, target);
    });

    showResults(results, shiftIndex);
});

// Clear the old results when another shift is picked
coverShift.addEventListener("change", function() {
    coverResults.innerHTML = "";
});

// Load the page
loadShifts();
