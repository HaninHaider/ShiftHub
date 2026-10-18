
import { supabase } from "./authorise.js";

const pendingSwapList = document.getElementById("pendingSwapList");
const pendingSwapCount = document.getElementById("pendingSwapCount");
const swapHistoryList = document.getElementById("swapHistoryList");

function loadData(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Unable to load", key, error);
        return [];
    }
}

let employees = [];
let shifts = [];
let swapOffers = [];
let swapRequests = [];

function refreshData() {
    employees = loadData("employees");
    shifts = loadData("shifts");
    swapOffers = loadData("swapOffers");
    swapRequests = loadData("swapRequests");
}

function saveData() {
    localStorage.setItem("shifts", JSON.stringify(shifts));
    localStorage.setItem("swapOffers", JSON.stringify(swapOffers));
    localStorage.setItem("swapRequests", JSON.stringify(swapRequests));
}

function shiftKey(shift) {
    return [
        shift.employeeName,
        shift.date,
        shift.start,
        shift.end
    ].join("|");
}

function findShift(key) {
    return shifts.find(shift => shiftKey(shift) === key);
}

function findOffer(request) {
    return swapOffers.find(offer => offer.id === request.offerId);
}

function showMessage(container, text) {
    container.innerHTML = "";

    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = text;

    container.appendChild(p);
}

function createButton(text, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button";
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
}

function createCard(title, description) {
    const card = document.createElement("div");
    card.className = "shift-card";

    const content = document.createElement("div");

    const heading = document.createElement("h3");
    heading.textContent = title;

    const details = document.createElement("p");
    details.className = "muted";
    details.textContent = description;

    content.appendChild(heading);
    content.appendChild(details);
    card.appendChild(content);

    return card;
}

function getEmployee(name) {
    return employees.find(employee => employee.name === name);
}

function getDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function getMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

function shiftHours(shift) {
    return (getMinutes(shift.end) - getMinutes(shift.start)) / 60;
}

function shiftTimes(shift) {
    const start = getDate(shift.date);
    start.setMinutes(getMinutes(shift.start));

    const end = getDate(shift.date);
    end.setMinutes(getMinutes(shift.end));

    return { start, end };
}

function sameWeek(dateA, dateB) {
    function monday(date) {
        const result = new Date(date);
        result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
        result.setHours(0, 0, 0, 0);
        return result.getTime();
    }

    return monday(dateA) === monday(dateB);
}

function isAvailable(employee, shift) {
    const dayName = getDate(shift.date).toLocaleDateString(
        "en-GB",
        { weekday: "long" }
    );

    const available = employee.availability?.[dayName];

    return Boolean(
        available &&
        available.startTime <= shift.start &&
        available.endTime >= shift.end
    );
}

function checkSchedule(employee, incomingShift, outgoingShift) {
    const updatedShifts = shifts
        .filter(shift => shift.employeeName === employee.name)
        .filter(shift => shiftKey(shift) !== shiftKey(outgoingShift))
        .map(shift => ({ ...shift }));

    updatedShifts.push({
        ...incomingShift,
        employeeName: employee.name
    });

    const orderedShifts = updatedShifts.sort(
        (a, b) => shiftTimes(a).start - shiftTimes(b).start
    );

    const under18 = employee.ageCategory === "under18";
    const minimumRest = under18 ? 12 : 11;

    for (const shift of orderedShifts) {
        if (shift.end <= shift.start) {
            return "Overnight shifts require additional checks.";
        }

        const hours = shiftHours(shift);

        if (hours <= 0) {
            return "Invalid shift duration.";
        }

        if (under18 && hours > 8) {
            return "Under-18 employees cannot work more than 8 hours a day.";
        }

        if (under18 && (
            getMinutes(shift.start) < 7 * 60 ||
            getMinutes(shift.end) > 19 * 60
        )) {
            return "Young-worker night restrictions require manager review.";
        }
    }

    // Check overlaps and minimum rest between consecutive shifts.
    for (let i = 1; i < orderedShifts.length; i++) {
        const previous = shiftTimes(orderedShifts[i - 1]);
        const next = shiftTimes(orderedShifts[i]);

        const restHours =
            (next.start - previous.end) / (1000 * 60 * 60);

        if (restHours < 0) {
            return "The swap creates overlapping shifts.";
        }

        if (restHours < minimumRest) {
            return (
                employee.name + " would have less than " +
                minimumRest + " hours between shifts."
            );
        }
    }

    // Apply the project's 40-hour weekly scheduling limit.
    for (const shift of orderedShifts) {
        const selectedDate = getDate(shift.date);

        const weekHours = orderedShifts
            .filter(item => sameWeek(getDate(item.date), selectedDate))
            .reduce((total, item) => total + shiftHours(item), 0);

        if (weekHours > 40) {
            return employee.name + " would exceed 40 hours that week.";
        }
    }

    // Additional daily checks for young workers.
    if (under18) {
        for (const shift of orderedShifts) {
            const dailyHours = orderedShifts
                .filter(item => item.date === shift.date)
                .reduce((total, item) => total + shiftHours(item), 0);

            if (dailyHours > 8) {
                return employee.name + " would exceed 8 hours in one day.";
            }
        }
    }

    return null;
}

// Check a proposed swap before changing the rota
function validateSwap(request) {
    const offer = findOffer(request);

    if (!offer || offer.status !== "reserved") {
        return "The offered shift is no longer reserved.";
    }

    if (request.status !== "pending_manager") {
        return "This request is not awaiting manager approval.";
    }

    const offeredShift = findShift(offer.shiftKey);
    const requesterShift = findShift(request.requesterShiftKey);

    if (!offeredShift || !requesterShift) {
        return "One of the original shifts no longer exists.";
    }

    if (
        offeredShift.employeeName !== offer.ownerName ||
        requesterShift.employeeName !== request.requesterName
    ) {
        return "The shift ownership has changed.";
    }

    if (offer.ownerName === request.requesterName) {
        return "An employee cannot swap with themselves.";
    }

    const owner = getEmployee(offer.ownerName);
    const requester = getEmployee(request.requesterName);

    if (!owner || !requester) {
        return "One or both employee records could not be found.";
    }

    if (
        owner.position !== requester.position ||
        owner.position !== offeredShift.position ||
        requester.position !== requesterShift.position
    ) {
        return "Both employees must have matching positions.";
    }

    if (!owner.ageCategory || !requester.ageCategory) {
        return "Both employees need an age category.";
    }

    if (!isAvailable(owner, requesterShift)) {
        return owner.name + " is unavailable for the requested shift.";
    }

    if (!isAvailable(requester, offeredShift)) {
        return requester.name + " is unavailable for the offered shift.";
    }

    const ownerProblem = checkSchedule(
        owner,
        requesterShift,
        offeredShift
    );

    if (ownerProblem) {
        return ownerProblem;
    }

    const requesterProblem = checkSchedule(
        requester,
        offeredShift,
        requesterShift
    );

    if (requesterProblem) {
        return requesterProblem;
    }

    return null;
}

// Approve a request and exchange shift assignments
function approveSwap(requestId) {
    refreshData();

    const request = swapRequests.find(item => item.id === requestId);

    if (!request) {
        alert("Request not found.");
        return;
    }

    const problem = validateSwap(request);

    if (problem) {
        alert("Cannot approve this swap:\n\n" + problem);
        return;
    }

    const offer = findOffer(request);
    const offeredShift = findShift(offer.shiftKey);
    const requesterShift = findShift(request.requesterShiftKey);

    if (!confirm(
        "Approve the swap between " +
        offer.ownerName + " and " +
        request.requesterName + "?"
    )) {
        return;
    }

    // Update the existing shift objects rather than dates or times.
    offeredShift.employeeName = request.requesterName;
    requesterShift.employeeName = offer.ownerName;

    request.status = "approved";
    request.reviewedAt = new Date().toISOString();

    offer.status = "completed";

    saveData();
    renderRequests();

    alert("Shift swap approved. The rota has been updated.");
}

// Reject a request without changing shifts
function rejectSwap(requestId) {
    refreshData();

    const request = swapRequests.find(item => item.id === requestId);

    if (!request || request.status !== "pending_manager") {
        alert("This request is no longer pending.");
        return;
    }

    if (!confirm("Reject this shift swap request?")) {
        return;
    }

    request.status = "rejected";
    request.reviewedAt = new Date().toISOString();

    const offer = findOffer(request);

    if (offer && offer.status === "reserved") {
        offer.status = "open";
    }

    saveData();
    renderRequests();
}

// Display requests
function renderRequests() {
    refreshData();

    pendingSwapList.innerHTML = "";
    swapHistoryList.innerHTML = "";

    const pending = swapRequests.filter(
        request => request.status === "pending_manager"
    );

    const history = swapRequests.filter(
        request => (
            request.status === "approved" ||
            request.status === "rejected"
        )
    );

    pendingSwapCount.textContent =
        pending.length +
        (pending.length === 1 ? " request" : " requests");

    if (pending.length === 0) {
        showMessage(
            pendingSwapList,
            "No shift swaps awaiting approval."
        );
    }

    pending.forEach(request => {
        const offer = findOffer(request);
        const offered = offer ? findShift(offer.shiftKey) : null;
        const requested = findShift(request.requesterShiftKey);

        const details =
            (offer?.ownerName || "Unknown") + ": " +
            (offered
                ? offered.date + " " + offered.start + "-" + offered.end
                : "Shift unavailable") +
            " ↔ " +
            request.requesterName + ": " +
            (requested
                ? requested.date + " " + requested.start + "-" + requested.end
                : "Shift unavailable");

        const card = createCard(
            "Pending Manager Approval",
            details
        );

        card.appendChild(
            createButton("Approve", () => approveSwap(request.id))
        );

        card.appendChild(
            createButton("Reject", () => rejectSwap(request.id))
        );

        pendingSwapList.appendChild(card);
    });

    if (history.length === 0) {
        showMessage(
            swapHistoryList,
            "No previous approved or rejected requests."
        );
    }

    history.forEach(request => {
        const offer = findOffer(request);

        const card = createCard(
            request.status === "approved" ? "Approved" : "Rejected",
            (offer?.ownerName || "Unknown") +
            " ↔ " + request.requesterName
        );

        swapHistoryList.appendChild(card);
    });
}

// Only allow approved managers to access this page
async function initialisePage() {
    showMessage(pendingSwapList, "Loading requests...");

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        window.location.replace("login.html");
        return;
    }

    const { data: account, error: accountError } = await supabase
        .from("employee_accounts")
        .select("position, status")
        .eq("user_id", data.user.id)
        .single();

    if (accountError || !account) {
        showMessage(pendingSwapList, "Unable to verify your account.");
        return;
    }

    if (account.status !== "approved") {
        window.location.replace("pending.html");
        return;
    }

    if (account.position !== "Manager") {
        window.location.replace("crew.html");
        return;
    }

    renderRequests();
}

initialisePage();
