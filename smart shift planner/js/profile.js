
import { supabase } from "./authorise.js";

const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profilePosition = document.getElementById("profilePosition");
const profileHours = document.getElementById("profileHours");
const profileAge = document.getElementById("profileAge");

// Keep the existing profile details if loading fails.
function showError(message) {
    profileName.textContent = message;
    profileEmail.textContent = "-";
    profilePosition.textContent = "-";
    profileHours.textContent = "-";
    profileAge.textContent = "-";
}

async function loadProfile() {
    try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            window.location.replace("login.html");
            return;
        }

        const user = data.user;

        // Account status and role are checked before showing details.
        const { data: account, error: accountError } = await supabase
            .from("employee_accounts")
            .select("full_name, email, position, status")
            .eq("user_id", user.id)
            .single();

        if (accountError || !account) {
            showError("Unable to load your account.");
            return;
        }

        if (account.status !== "approved") {
            window.location.replace("pending.html");
            return;
        }

        if (
            account.position !== "Crew" &&
            account.position !== "QC"
        ) {
            window.location.replace("manager.html");
            return;
        }

        profileName.textContent = account.full_name;
        profileEmail.textContent = account.email;
        profilePosition.textContent = account.position;

// Get the employee's work details from their profile
        const { data: profile, error: profileError } = await supabase
            .from("employee_profiles")
            .select("contracted_hours, age_category")
            .eq("user_id", user.id)
            .single();

        if (profileError || !profile) {
            profileHours.textContent = "Not set";
            profileAge.textContent = "Not set";
            return;
        }

        if (profile.contracted_hours !== null) {
            profileHours.textContent =
                profile.contracted_hours + " hours";
        } else {
            profileHours.textContent = "Not set";
        }

        if (profile.age_category === "under18") {
            profileAge.textContent = "Under 18";
        } else if (profile.age_category === "adult") {
            profileAge.textContent = "18 or Over";
        } else {
            profileAge.textContent = "Not set";
        }

    } catch (error) {
        console.error("Profile loading error:", error);
        showError("Unable to load your profile.");
    }
}

loadProfile();
