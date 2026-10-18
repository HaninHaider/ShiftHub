
import { supabase } from "./authorise.js";

// Page elements
const crewEmployee = document.getElementById("crewEmployee");
const crewCalendar = document.getElementById("crewCalendar");
const crewWeekLabel = document.getElementById("crewWeekLabel");
const crewSelectedDay = document.getElementById("crewSelectedDay");

const myShiftList = document.getElementById("myShiftList");
const teamShiftList = document.getElementById("teamShiftList");
const myShiftCount = document.getElementById("myShiftCount");
const teamShiftCount = document.getElementById("teamShiftCount");

const crewTotalShifts = document.getElementById("crewTotalShifts");
const crewTotalHours = document.getElementById("crewTotalHours");
const crewContractHours = document.getElementById("crewContractHours");

const availableSwaps = document.getElementById("availableSwaps");

const prevWeekButton = document.getElementById("crewPrevWeek");
const nextWeekButton = document.getElementById("crewNextWeek");
const todayButton = document.getElementById("crewToday");

// Get the saved data from localStorage
function readArray(key) {
    try {
        const saved = JSON.parse(
            localStorage.getItem(key) || "[]"
        );

        return Array.isArray(saved) ? saved : [];

    } catch (error) {
        console.error("Unable to read " + key, error);
        return [];
    }
}

let employees = readArray("employees");
let shifts = readArray("shifts");
let swapOffers = readArray("swapOffers");
let swapRequests = readArray("swapRequests");

let currentEmployeeName = "";
let currentEmployeePosition = "";

let selectedDate = getDateString(new Date());
let currentWeek = getMonday(new Date());

const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];

// Save shift swap information to local storage?
function saveSwaps() {
    localStorage.setItem(
        "swapOffers",
        JSON.stringify(swapOffers)
    );

    localStorage.setItem(
        "swapRequests",
        JSON.stringify(swapRequests)
    );
}

// date as YYYY-MM-DD
function getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Turn the saved date into a Date object
function parseDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

//  Monday of selected week
function getMonday(value) {
    const monday = new Date(value);

    monday.setDate(
        monday.getDate() - ((monday.getDay() + 6) % 7)
    );

    monday.setHours(0, 0, 0, 0);
    return monday;
}

// Calculate scheduled hours
function calculateHours(start, end) {
    const [h1, m1] = start.split(":").map(Number);
    const [h2, m2] = end.split(":").map(Number);

    let duration =
        (h2 * 60 + m2) - (h1 * 60 + m1);

    if (duration < 0) {
        duration += 1440;
    }

    return duration / 60;
}

// Identify a shift
function shiftKey(shift) {
    return [
        shift.employeeName,
        shift.date,
        shift.start,
        shift.end
    ].join("|");
}

// Find a shift
function findShift(key) {
    return shifts.find(function(shift) {
        return shiftKey(shift) === key;
    });
}

// Generate a unique request ID
function newId() {
    return crypto.randomUUID();
}

// Display a message
function message(container, text) {
    container.innerHTML = "";

    const paragraph = document.createElement("p");
    paragraph.className = "muted";
    paragraph.textContent = text;

    container.appendChild(paragraph);
}

// Create a button
function createButton(
    text,
    callback,
    className = "secondary-button"
) {
    const element = document.createElement("button");

    element.type = "button";
    element.className = className;
    element.textContent = text;

    element.addEventListener("click", callback);

    return element;
}

// Create a shift card
function createCard(title, detail) {
    const wrapper = document.createElement("div");
    wrapper.className = "shift-card";

    const info = document.createElement("div");

    const heading = document.createElement("h3");
    heading.textContent = title;

    const paragraph = document.createElement("p");
    paragraph.className = "muted";
    paragraph.textContent = detail;

    info.appendChild(heading);
    info.appendChild(paragraph);

    wrapper.appendChild(info);

    return wrapper;
}

// Load the signed-in employee
async function loadCurrentEmployee() {

    // Display calendar straight away
    displayCalendar();
    displayShifts();
    renderSwaps();

    try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            window.location.replace("login.html");
            return;
        }

        const { data: account, error: accountError } =
            await supabase
                .from("employee_accounts")
                .select("full_name, position, status")
                .eq("user_id", data.user.id)
                .single();

        if (accountError || !account) {
            message(
                myShiftList,
                "Unable to load your account."
            );
            return;
        }

        if (account.status !== "approved") {
            window.location.replace("pending.html");
            return;
        }

        if (account.position === "Manager") {
            window.location.replace("manager.html");
            return;
        }

        if (
            account.position !== "Crew" &&
            account.position !== "QC"
        ) {
            message(
                myShiftList,
                "This account cannot access the Crew Rota."
            );
            return;
        }

// Find the employee using their name 
        const matchingEmployee = employees.find(
            function(employee) {
                return employee.name?.trim().toLowerCase() ===
                       account.full_name?.trim().toLowerCase();
            }
        );

        currentEmployeeName = matchingEmployee?.name || "";

        currentEmployeePosition =
            matchingEmployee?.position || account.position;

        // show employee name without allowing selection
        crewEmployee.innerHTML = "";

        const option = document.createElement("option");
        option.value = currentEmployeeName;

        option.textContent = currentEmployeeName ||
            account.full_name + " - employee record not linked";

        crewEmployee.appendChild(option);
        crewEmployee.disabled = true;

        displayCalendar();
        displayShifts();
        renderSwaps();

        if (!matchingEmployee) {
            message(
                myShiftList,
                "Your manager needs to link your employee " +
                "record before shifts and swaps can appear."
            );
        }

    } catch (error) {
        console.error(error);

        message(
            myShiftList,
            "Unable to load the Crew Rota account."
        );
    }
}

// show weekly calendar
function displayCalendar() {
    crewCalendar.innerHTML = "";

    const sunday = new Date(currentWeek);
    sunday.setDate(sunday.getDate() + 6);

    crewWeekLabel.textContent =
        currentWeek.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short"
        }) +
        " - " +
        sunday.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });

    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeek);
        date.setDate(date.getDate() + i);

        const dateString = getDateString(date);

        const count = shifts.filter(function(shift) {
            return shift.date === dateString &&
                   shift.employeeName === currentEmployeeName;
        }).length;

        const dayButton = document.createElement("button");
        dayButton.type = "button";
        dayButton.className = "calendar-day";

        if (dateString === selectedDate) {
            dayButton.classList.add("selected");
        }

        const dayLabel = document.createElement("span");
        dayLabel.textContent =
            days[date.getDay()].slice(0, 3);

        const dayNumber = document.createElement("strong");
        dayNumber.textContent = date.getDate();

        const shiftCount = document.createElement("small");
        shiftCount.textContent =
            count + (count === 1 ? " shift" : " shifts");

        dayButton.appendChild(dayLabel);
        dayButton.appendChild(dayNumber);
        dayButton.appendChild(shiftCount);

        dayButton.addEventListener("click", function() {
            selectedDate = dateString;
            displayCalendar();
            displayShifts();
        });

        crewCalendar.appendChild(dayButton);
    }

    updateWeeklyHours();
}

// show personal shifts and team schedule on therota
function displayShifts() {
    myShiftList.innerHTML = "";
    teamShiftList.innerHTML = "";

    const date = parseDate(selectedDate);

    crewSelectedDay.textContent =
        date.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    const myShifts = shifts
        .filter(function(shift) {
            return currentEmployeeName &&
                   shift.date === selectedDate &&
                   shift.employeeName === currentEmployeeName;
        })
        .sort(function(a, b) {
            return a.start.localeCompare(b.start);
        });

    const teamShifts = shifts
        .filter(function(shift) {
            return shift.date === selectedDate &&
                   shift.employeeName !== currentEmployeeName;
        })
        .sort(function(a, b) {
            return a.start.localeCompare(b.start);
        });

    myShiftCount.textContent =
        myShifts.length +
        (myShifts.length === 1 ? " shift" : " shifts");

    teamShiftCount.textContent =
        teamShifts.length +
        (teamShifts.length === 1 ? " shift" : " shifts");

    if (!currentEmployeeName) {
        message(
            myShiftList,
            "Your employee profile is not linked yet."
        );

        message(
            teamShiftList,
            "No team schedule available."
        );

        return;
    }

    // Show employee's own shifts
    if (myShifts.length === 0) {
        message(
            myShiftList,
            "You have no shifts scheduled for this day."
        );
    }

    myShifts.forEach(function(shift) {
        const item = createCard(
            shift.employeeName,
            shift.position + " | " +
            shift.start + " - " + shift.end
        );

        const existingOffer = swapOffers.find(function(offer) {
            return offer.shiftKey === shiftKey(shift) &&
                   offer.status === "open";
        });

        if (existingOffer) {
            item.appendChild(
                createButton(
                    "Withdraw Offer",
                    function() {
                        withdrawOffer(existingOffer.id);
                    }
                )
            );
        } else {
            item.appendChild(
                createButton(
                    "Offer Shift",
                    function() {
                        offerShift(shift);
                    }
                )
            );
        }

        myShiftList.appendChild(item);
    });

    // Show other employees' shifts
    if (teamShifts.length === 0) {
        message(
            teamShiftList,
            "No other employees are scheduled for this day."
        );
    }

    teamShifts.forEach(function(shift) {
        const item = createCard(
            shift.employeeName,
            shift.position + " | " +
            shift.start + " - " + shift.end
        );

        teamShiftList.appendChild(item);
    });
}

// Calculate weekly scheduled hours
function updateWeeklyHours() {
    const sunday = new Date(currentWeek);
    sunday.setDate(sunday.getDate() + 6);

    const weekStart = getDateString(currentWeek);
    const weekEnd = getDateString(sunday);

    const weeklyShifts = shifts.filter(function(shift) {
        return currentEmployeeName &&
               shift.employeeName === currentEmployeeName &&
               shift.date >= weekStart &&
               shift.date <= weekEnd;
    });

    let totalHours = 0;

    weeklyShifts.forEach(function(shift) {
        totalHours += calculateHours(
            shift.start,
            shift.end
        );
    });

    const employee = employees.find(function(item) {
        return item.name === currentEmployeeName;
    });

    const contractedHours = employee
        ? Number(
            employee.contractedHours ?? employee.hours ?? 0
        )
        : 0;

    crewTotalShifts.textContent = weeklyShifts.length;
    crewTotalHours.textContent = totalHours.toFixed(1) + " hrs";
    crewContractHours.textContent = contractedHours + " hrs";
}

// Check whether a shift swap is suitable
function checkSwapEligibility(offeredShift, myShift) {

    if (!offeredShift || !myShift || !currentEmployeeName) {
        return false;
    }

    // Cannot swap with yourself
    if (
        offeredShift.employeeName === currentEmployeeName ||
        myShift.employeeName !== currentEmployeeName
    ) {
        return false;
    }

    // Positions must match
    if (
        offeredShift.position !== myShift.position ||
        offeredShift.position !== currentEmployeePosition
    ) {
        return false;
    }

    // Overnight shifts need additional checks
    if (
        offeredShift.start >= offeredShift.end ||
        myShift.start >= myShift.end
    ) {
        return false;
    }

    const otherEmployee = employees.find(function(employee) {
        return employee.name === offeredShift.employeeName;
    });

    const me = employees.find(function(employee) {
        return employee.name === currentEmployeeName;
    });

    if (!otherEmployee || !me) {
        return false;
    }

    // Check availability for both employees
    function isAvailable(employee, shift) {
        const day = days[parseDate(shift.date).getDay()];
        const availability = employee.availability?.[day];

        return availability &&
               availability.startTime <= shift.start &&
               availability.endTime >= shift.end;
    }

    if (
        !isAvailable(me, offeredShift) ||
        !isAvailable(otherEmployee, myShift)
    ) {
        return false;
    }

    // Check overlapping shifts
    function hasOverlap(employeeName, incoming, outgoing) {
        return shifts.some(function(shift) {
            return shift.employeeName === employeeName &&
                   shiftKey(shift) !== shiftKey(outgoing) &&
                   shift.date === incoming.date &&
                   incoming.start < shift.end &&
                   incoming.end > shift.start;
        });
    }

    if (
        hasOverlap(
            currentEmployeeName,
            offeredShift,
            myShift
        ) ||
        hasOverlap(
            offeredShift.employeeName,
            myShift,
            offeredShift
        )
    ) {
        return false;
    }

    // Full hours, rest and age checks will be added
    // before enabling manager approval.
    return true;
}

// Offer a shift
function offerShift(shift) {
    if (
        !currentEmployeeName ||
        shift.employeeName !== currentEmployeeName
    ) {
        return;
    }

    const key = shiftKey(shift);

    const alreadyOffered = swapOffers.some(function(offer) {
        return offer.shiftKey === key &&
               offer.status === "open";
    });

    if (alreadyOffered) {
        return;
    }

    if (!confirm(
        "Offer your " + shift.date + " " +
        shift.start + "-" + shift.end +
        " shift for swapping?"
    )) {
        return;
    }

    swapOffers.push({
        id: newId(),
        shiftKey: key,
        ownerName: currentEmployeeName,
        status: "open"
    });

    saveSwaps();
    displayShifts();
    renderSwaps();
}

// Withdraw an offered shift
function withdrawOffer(id) {
    const offer = swapOffers.find(function(item) {
        return item.id === id &&
               item.ownerName === currentEmployeeName;
    });

    if (!offer) {
        return;
    }

    if (!confirm("Withdraw this swap offer?")) {
        return;
    }

    offer.status = "withdrawn";

    swapRequests.forEach(function(request) {
        if (
            request.offerId === id &&
            request.status === "requested"
        ) {
            request.status = "cancelled";
        }
    });

    saveSwaps();
    displayShifts();
    renderSwaps();
}

// Request a swap
function requestSwap(offer) {
    const offeredShift = findShift(offer.shiftKey);

    const myOptions = shifts.filter(function(shift) {
        return shift.employeeName === currentEmployeeName &&
               checkSwapEligibility(offeredShift, shift);
    });

    if (myOptions.length === 0) {
        alert(
            "You have no suitable shift to exchange. " +
            "Check availability and overlapping shifts."
        );
        return;
    }

    let optionsText = "Which shift would you like to exchange?\n\n";

    myOptions.forEach(function(shift, index) {
        optionsText +=
            (index + 1) + ". " +
            shift.date + " " +
            shift.start + "-" + shift.end + "\n";
    });

    optionsText += "\nEnter the option number:";

    const selection = prompt(optionsText);

    if (selection === null) {
        return;
    }

    const selectedIndex = Number(selection) - 1;

    if (
        !Number.isInteger(selectedIndex) ||
        selectedIndex < 0 ||
        selectedIndex >= myOptions.length
    ) {
        alert("Please enter a valid shift number.");
        return;
    }

    const alreadyRequested = swapRequests.some(function(request) {
        return request.offerId === offer.id &&
               request.requesterName === currentEmployeeName &&
               (
                   request.status === "requested" ||
                   request.status === "pending_manager"
               );
    });

    if (alreadyRequested) {
        alert("You already requested this shift.");
        return;
    }

    swapRequests.push({
        id: newId(),
        offerId: offer.id,
        requesterName: currentEmployeeName,
        requesterShiftKey: shiftKey(myOptions[selectedIndex]),
        status: "requested"
    });

    saveSwaps();
    renderSwaps();

    alert(
        "Swap request sent. The other employee must " +
        "accept it before manager approval."
    );
}

// Accept or decline an incoming request
function respondToSwap(request, accept) {
    const offer = swapOffers.find(function(item) {
        return item.id === request.offerId;
    });

    if (
        !offer ||
        offer.ownerName !== currentEmployeeName ||
        request.status !== "requested"
    ) {
        return;
    }

    if (accept) {
        if (!confirm(
            "Accept this request and send it for manager approval?"
        )) {
            return;
        }
    }

    request.status = accept
        ? "pending_manager"
        : "declined";

    if (accept) {
        offer.status = "reserved";

        swapRequests.forEach(function(otherRequest) {
            if (
                otherRequest.offerId === offer.id &&
                otherRequest.id !== request.id &&
                otherRequest.status === "requested"
            ) {
                otherRequest.status = "declined";
            }
        });
    }

    saveSwaps();
    displayShifts();
    renderSwaps();
}

// Display available offers and requests
function renderSwaps() {
    if (!availableSwaps) {
        return;
    }

    availableSwaps.innerHTML = "";

    if (!currentEmployeeName) {
        message(
            availableSwaps,
            "Your employee profile must be linked " +
            "before you can request swaps."
        );
        return;
    }

    // Available offers from other employees
    const openOffers = swapOffers.filter(function(offer) {
        return offer.status === "open" &&
               findShift(offer.shiftKey);
    });

    const otherOffers = openOffers.filter(function(offer) {
        return offer.ownerName !== currentEmployeeName;
    });

    otherOffers.forEach(function(offer) {
        const shift = findShift(offer.shiftKey);

        const item = createCard(
            shift.employeeName,
            shift.date + " | " +
            shift.start + " - " +
            shift.end + " | " +
            shift.position
        );

        const suitableShifts = shifts.filter(function(myShift) {
            return myShift.employeeName === currentEmployeeName &&
                   checkSwapEligibility(shift, myShift);
        });

        const swapButton = createButton(
            "Request Swap",
            function() {
                requestSwap(offer);
            },
            "primary-button"
        );

        swapButton.disabled = suitableShifts.length === 0;

        if (suitableShifts.length === 0) {
            const warning = document.createElement("p");
            warning.className = "muted";
            warning.textContent =
                "Not eligible with your current shifts.";

            item.appendChild(warning);
        }

        item.appendChild(swapButton);
        availableSwaps.appendChild(item);
    });

    if (otherOffers.length === 0) {
        message(
            availableSwaps,
            "No shifts currently offered for swapping."
        );
    }

    // Requests involving the signed-in employee
    const relevantRequests = swapRequests.filter(function(request) {
        const offer = swapOffers.find(function(item) {
            return item.id === request.offerId;
        });

        return request.requesterName === currentEmployeeName ||
               offer?.ownerName === currentEmployeeName;
    });

    if (relevantRequests.length > 0) {
        const heading = document.createElement("h3");
        heading.textContent = "My Swap Requests";
        availableSwaps.appendChild(heading);
    }

    relevantRequests.forEach(function(request) {
        const offer = swapOffers.find(function(item) {
            return item.id === request.offerId;
        });

        const offeredShift = offer
            ? findShift(offer.shiftKey)
            : null;

        const requesterShift = findShift(
            request.requesterShiftKey
        );

        const incoming =
            offer?.ownerName === currentEmployeeName;

        const requestType = incoming
            ? "Incoming"
            : "Outgoing";

        const item = createCard(
            requestType + " - " +
            request.status.replaceAll("_", " "),
            request.requesterName + ": " +
            (requesterShift?.date || "Shift removed") +
            " ↔ " +
            (offer?.ownerName || "Unknown") + ": " +
            (offeredShift?.date || "Shift removed")
        );

        if (incoming && request.status === "requested") {
            item.appendChild(
                createButton(
                    "Accept",
                    function() {
                        respondToSwap(request, true);
                    }
                )
            );

            item.appendChild(
                createButton(
                    "Decline",
                    function() {
                        respondToSwap(request, false);
                    }
                )
            );
        }

        availableSwaps.appendChild(item);
    });

    const note = document.createElement("p");
    note.className = "muted";

    note.textContent =
        "Test version: swap requests are saved in this " +
        "browser. Accepted requests still need manager approval.";

    availableSwaps.appendChild(note);
}

// Previous week
prevWeekButton.addEventListener("click", function() {
    currentWeek.setDate(
        currentWeek.getDate() - 7
    );

    selectedDate = getDateString(currentWeek);

    displayCalendar();
    displayShifts();
});

// Next week
nextWeekButton.addEventListener("click", function() {
    currentWeek.setDate(
        currentWeek.getDate() + 7
    );

    selectedDate = getDateString(currentWeek);

    displayCalendar();
    displayShifts();
});

// Today
todayButton.addEventListener("click", function() {
    selectedDate = getDateString(new Date());
    currentWeek = getMonday(new Date());

    displayCalendar();
    displayShifts();
});

// Load Crew Rota
loadCurrentEmployee();
