
import { supabase } from "./authorise.js";

const requestsList = document.getElementById("requestsList");
const requestMessage = document.getElementById("requestMessage");

async function loadRequests() {
    requestMessage.textContent = "Loading requests...";
    requestsList.innerHTML = "";

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Confirm that the current account is a manager
    const { data: myAccount, error: accountError } = await supabase
        .from("employee_accounts")
        .select("position, status")
        .eq("user_id", user.id)
        .single();

    if (
        accountError ||
        myAccount?.status !== "approved" ||
        myAccount?.position !== "Manager"
    ) {
        requestMessage.textContent = "Manager access required.";
        return;
    }

    const { data: requests, error } = await supabase
        .from("employee_accounts")
        .select("user_id, full_name, email, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        requestMessage.textContent = error.message;
        return;
    }

    if (requests.length === 0) {
        requestMessage.textContent = "No pending requests.";
        return;
    }

    requestMessage.textContent =
        requests.length + " account request(s) awaiting approval.";

    requests.forEach(function(request) {
        const card = document.createElement("div");
        card.className = "shift-card";
        card.style.marginBottom = "16px";

        const details = document.createElement("div");

        const name = document.createElement("h3");
        name.textContent = request.full_name;

        const email = document.createElement("p");
        email.textContent = request.email;
        email.className = "muted";

        const positionLabel = document.createElement("label");
        positionLabel.textContent = "Assign Position";

        const positionSelect = document.createElement("select");

        ["Crew", "QC", "Manager"].forEach(function(position) {
            const option = document.createElement("option");
            option.value = position;
            option.textContent = position;
            positionSelect.appendChild(option);
        });

        const approveButton = document.createElement("button");
        approveButton.textContent = "Approve";
        approveButton.className = "primary-button";
        approveButton.type = "button";

        const rejectButton = document.createElement("button");
        rejectButton.textContent = "Reject";
        rejectButton.type = "button";

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.flexWrap = "wrap";
        actions.style.gap = "12px";
        actions.style.marginTop = "12px";

        actions.appendChild(approveButton);
        actions.appendChild(rejectButton);

        details.appendChild(name);
        details.appendChild(email);
        details.appendChild(positionLabel);
        details.appendChild(positionSelect);
        details.appendChild(actions);
        card.appendChild(details);

        requestsList.appendChild(card);

        async function review(decision) {
            if (decision === "approved" &&
                positionSelect.value === "Manager") {
                if (!confirm("Give this person Manager access?")) {
                    return;
                }
            }

            if (decision === "rejected") {
                if (!confirm("Reject this account request?")) {
                    return;
                }
            }

            approveButton.disabled = true;
            rejectButton.disabled = true;

            const { error } = await supabase.rpc(
                "review_employee_account",
                {
                    target_user_id: request.user_id,
                    decision: decision,
                    assigned_position:
                        decision === "approved"
                            ? positionSelect.value
                            : null
                }
            );

            if (error) {
                alert(error.message);
                approveButton.disabled = false;
                rejectButton.disabled = false;
                return;
            }

            await loadRequests();
        }

        approveButton.addEventListener("click", function() {
            review("approved");
        });

        rejectButton.addEventListener("click", function() {
            review("rejected");
        });
    });
}

loadRequests();
