
import { supabase } from "./authorise.js";

const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", async function() {
    logoutButton.disabled = true;
    logoutButton.textContent = "Logging Out...";

    try {
        // End the active session before returning to login.
        const { error } = await supabase.auth.signOut();

        if (error) {
            alert(error.message);
            return;
        }

        window.location.href = "login.html";

    } catch (error) {
        console.error(error);
        alert("Unable to log out. Please try again.");

    } finally {
        logoutButton.disabled = false;
        logoutButton.textContent = "Log Out";
    }
});
