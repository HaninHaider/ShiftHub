
import { supabase } from "./authorise.js";

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const button = loginForm.querySelector('button[type="submit"]');

    button.disabled = true;
    button.textContent = "Signing In...";

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert(error.message);
            return;
        }

        // Check approval and position before opening a dashboard.
        const { data: account, error: accountError } = await supabase
            .from("employee_accounts")
            .select("status, position")
            .eq("user_id", data.user.id)
            .single();

        if (accountError || !account) {
            alert("Unable to check your account approval status.");
            await supabase.auth.signOut();
            return;
        }

        if (account.status === "pending") {
            await supabase.auth.signOut();
            window.location.href = "pending.html";
            return;
        }

        if (account.status === "rejected") {
            await supabase.auth.signOut();
            alert("Your account request has not been approved.");
            return;
        }

        if (account.status !== "approved") {
            await supabase.auth.signOut();
            alert("Your account is not authorised.");
            return;
        }

        // Managers and Crew have separate dashboards.
        if (account.position === "Manager") {
            window.location.href = "manager.html";
        } else if (
            account.position === "Crew" ||
            account.position === "QC"
        ) {
            window.location.href = "crew.html";
        } else {
            await supabase.auth.signOut();
            alert("No valid position has been assigned.");
        }

    } catch (error) {
        console.error(error);
        alert("Unable to sign in. Please try again.");

    } finally {
        button.disabled = false;
        button.textContent = "Sign In";
    }
});
