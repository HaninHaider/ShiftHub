
import { supabase } from "./authorise.js";

const welcomeHeading = document.getElementById("crewWelcome");
const crewAccountMessage = document.getElementById("crewAccountMessage");

async function loadCrewDashboard() {
    try {
        // Check the current session before displaying account details.
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            window.location.replace("login.html");
            return;
        }

        const user = data.user;

        const { data: account, error: accountError } = await supabase
            .from("employee_accounts")
            .select("full_name, email, position, status")
            .eq("user_id", user.id)
            .single();

        if (accountError || !account) {
            if (crewAccountMessage) {
                crewAccountMessage.textContent =
                    "Unable to load your employee account.";
            }
            return;
        }

        // Only approved Crew and QC accounts should use this dashboard.
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
            if (crewAccountMessage) {
                crewAccountMessage.textContent =
                    "Your account does not have a valid position.";
            }
            return;
        }

        const name = account.full_name || "Team Member";

        if (welcomeHeading) {
            welcomeHeading.textContent = "Welcome, " + name;
        }

        if (crewAccountMessage) {
            crewAccountMessage.textContent =
                "View your shifts, manage your availability " +
                "and keep track of your working hours.";
        }

    } catch (error) {
        console.error("Crew Dashboard error:", error);

        if (crewAccountMessage) {
            crewAccountMessage.textContent =
                "Unable to load your account information.";
        }
    }
}

loadCrewDashboard();
