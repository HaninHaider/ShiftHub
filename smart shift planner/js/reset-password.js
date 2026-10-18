
import { supabase } from "./authorise.js";

const form = document.getElementById("resetPasswordForm");
const message = document.getElementById("passwordMessage");
const button = form.querySelector('button[type="submit"]');

let recoveryReady = false;

// Only allow password changes after a valid recovery link is opened.
supabase.auth.onAuthStateChange(function(event, session) {
    if (event === "PASSWORD_RECOVERY" && session) {
        recoveryReady = true;
        form.hidden = false;
        message.textContent =
            "Enter a new password with at least 12 characters.";
    }
});

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (!recoveryReady) {
        message.textContent =
            "Please open a valid password reset link.";
        return;
    }

    const password = document.getElementById("newPassword").value;
    const confirmPassword =
        document.getElementById("confirmPassword").value;

    if (password.length < 12) {
        message.textContent =
            "Your password must be at least 12 characters.";
        return;
    }

    if (password !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        return;
    }

    button.disabled = true;
    button.textContent = "Updating...";

    try {
        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            message.textContent = error.message;
            return;
        }

        message.textContent = "Password updated successfully!";
        form.hidden = true;

        await supabase.auth.signOut();

        window.location.replace("login.html");

    } catch (error) {
        console.error(error);
        message.textContent = "Unable to update your password.";

    } finally {
        button.disabled = false;
        button.textContent = "Update Password";
    }
});
