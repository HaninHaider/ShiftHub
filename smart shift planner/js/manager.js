
const employeeForm = document.getElementById("employeeForm");
const employeeList = document.getElementById("employeeList");
const availabilityForm = document.getElementById("availabilityForm");
const availabilityEmployee = document.getElementById("availabilityEmployee");
const weeklyAvailability = document.getElementById("weeklyAvailability");

let employees = JSON.parse(localStorage.getItem("employees") || "[]");

const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
];

let editingIndex = -1;

// Save employee information
function saveEmployees() {
    localStorage.setItem("employees", JSON.stringify(employees));
}

// Check contracted hours
function validHours(hours) {
    return Number.isFinite(hours) &&
           hours >= 0 &&
           hours <= 40 &&
           Number.isInteger(hours * 2);
}

// Show all employees
function displayEmployees() {
    employeeList.innerHTML = "";

    employees.forEach(function(employee, index) {
        const li = document.createElement("li");
        li.className = "employee-item";

        let age = "Age not specified";

        if (employee.ageCategory === "under18") {
            age = "Under 18";
        } else if (employee.ageCategory === "adult") {
            age = "18 or Over";
        }

        const details = document.createElement("span");

        details.textContent =
            employee.name + " - " +
            employee.position + " - " +
            employee.hours + " hours - " + age + " ";

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.type = "button";

        editButton.addEventListener("click", function() {
            editEmployee(index);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.type = "button";

        deleteButton.addEventListener("click", function() {
            deleteEmployee(index);
        });

        li.appendChild(details);
        li.appendChild(editButton);
        li.appendChild(deleteButton);

        employeeList.appendChild(li);
    });

    updateEmployeeDropdown();
}

// Update the availability dropdown
function updateEmployeeDropdown() {
    const selected = availabilityEmployee.value;

    availabilityEmployee.innerHTML =
        '<option value="">Select an employee</option>';

    employees.forEach(function(employee, index) {
        const option = document.createElement("option");

        option.value = index;
        option.textContent = employee.name;

        availabilityEmployee.appendChild(option);
    });

    if (selected !== "" &&
        Number(selected) >= 0 &&
        Number(selected) < employees.length) {
        availabilityEmployee.value = selected;
    }
}

// Add or update an employee
employeeForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("employeeName").value.trim();
    const position = document.getElementById("position").value;
    const hoursInput = document.getElementById("contractHours").value;
    const hours = Number(hoursInput);
    const ageCategory = document.getElementById("ageCategory").value;

    if (name === "") {
        alert("Please enter an employee name.");
        return;
    }

    if (hoursInput === "" || !validHours(hours)) {
        alert("Contracted hours must be between 0 and 40, in steps of 0.5.");
        return;
    }

    if (editingIndex === -1) {
        const employee = {
            name: name,
            position: position,
            hours: hours,
            ageCategory: ageCategory,
            availability: {}
        };

        employees.push(employee);
    } else {
        const employee = employees[editingIndex];

        employee.name = name;
        employee.position = position;
        employee.hours = hours;
        employee.ageCategory = ageCategory;
    }

    saveEmployees();
    displayEmployees();

    cancelEdit();
});

// Edit employee details using the form
function editEmployee(index) {
    const employee = employees[index];

    document.getElementById("employeeName").value = employee.name;
    document.getElementById("position").value = employee.position;
    document.getElementById("contractHours").value = employee.hours;
    document.getElementById("ageCategory").value = employee.ageCategory;

    editingIndex = index;

    employeeForm.querySelector('button[type="submit"]').textContent =
        "Save Changes";

    document.getElementById("employeeName").focus();
}

// Finish editing
function cancelEdit() {
    editingIndex = -1;
    employeeForm.reset();

    employeeForm.querySelector('button[type="submit"]').textContent =
        "Add Employee";
}

// Delete an employee
function deleteEmployee(index) {
    const employee = employees[index];

    if (!confirm("Delete " + employee.name + "?")) {
        return;
    }

    const selected = availabilityEmployee.value;

    employees.splice(index, 1);

    if (editingIndex === index) {
        cancelEdit();
    } else if (editingIndex > index) {
        editingIndex--;
    }

    saveEmployees();
    displayEmployees();

    if (selected !== "") {
        if (Number(selected) === index) {
            availabilityEmployee.value = "";
        } else if (Number(selected) > index) {
            availabilityEmployee.value = Number(selected) - 1;
        } else {
            availabilityEmployee.value = selected;
        }
    }

    loadAvailability();
}

// Create the weekly availability fields
function showWeeklyAvailability() {
    weeklyAvailability.innerHTML = "";

    days.forEach(function(day) {
        const row = document.createElement("div");
        row.className = "availability-row";

        row.innerHTML = `
            <label>
                <input type="checkbox"
                       class="availableDay"
                       value="${day}">
                ${day}
            </label>

            <label for="${day}Start">From</label>
            <input type="time" id="${day}Start" disabled>

            <label for="${day}End">Until</label>
            <input type="time" id="${day}End" disabled>
        `;

        weeklyAvailability.appendChild(row);

        const checkbox = row.querySelector(".availableDay");
        const startInput = document.getElementById(day + "Start");
        const endInput = document.getElementById(day + "End");

        checkbox.addEventListener("change", function() {
            startInput.disabled = !checkbox.checked;
            endInput.disabled = !checkbox.checked;

            if (!checkbox.checked) {
                startInput.value = "";
                endInput.value = "";
            }
        });
    });
}

// Load saved availability
function loadAvailability() {
    showWeeklyAvailability();

    const index = availabilityEmployee.value;

    if (index === "") {
        return;
    }

    const employee = employees[Number(index)];

    if (!employee || !employee.availability) {
        return;
    }

    days.forEach(function(day) {
        const savedDay = employee.availability[day];

        if (!savedDay) {
            return;
        }

        const checkbox = weeklyAvailability.querySelector(
            `input[value="${day}"]`
        );

        const startInput = document.getElementById(day + "Start");
        const endInput = document.getElementById(day + "End");

        checkbox.checked = true;

        startInput.disabled = false;
        endInput.disabled = false;

        startInput.value = savedDay.startTime;
        endInput.value = savedDay.endTime;
    });
}

// Change selected employee
availabilityEmployee.addEventListener("change", loadAvailability);

// Save weekly availability
availabilityForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const index = availabilityEmployee.value;

    if (index === "") {
        alert("Please select an employee.");
        return;
    }

    const employee = employees[Number(index)];
    const availability = {};

    let selectedDays = 0;

    for (const day of days) {
        const checkbox = weeklyAvailability.querySelector(
            `input[value="${day}"]`
        );

        if (!checkbox.checked) {
            continue;
        }

        const startTime = document.getElementById(day + "Start").value;
        const endTime = document.getElementById(day + "End").value;

        if (startTime === "" || endTime === "") {
            alert("Please enter the available hours for " + day + ".");
            return;
        }

        if (startTime >= endTime) {
            alert("The finish time must be later than the start time on " + day + ".");
            return;
        }

        availability[day] = {
            startTime: startTime,
            endTime: endTime
        };

        selectedDays++;
    }

    if (selectedDays === 0) {
        alert("Select at least one available day.");
        return;
    }

    employee.availability = availability;

    saveEmployees();

    alert("Availability saved for " + employee.name + "!");
});

// Load saved information
showWeeklyAvailability();
displayEmployees();
