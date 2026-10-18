
import { supabase } from "./authorise.js";

const form = document.getElementById("forgotPasswordForm");
const message = document.getElementById("resetMessage");
const button = form.querySelector('button[type="submit"]');

// Request a reset link without confirming whether an email is registered.
form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();

    button.disabled = true;
    button.textContent = "Sending...";

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(
            email,
            {
                redirectTo: new URL(
                    "reset-password.html",
                    window.location.href
                ).href
            }
        );

        if (error) {
            message.textContent = error.message;
            return;
        }

        message.textContent =
            "If an account exists for this email, " +
            "you'll receive a password reset link.";

    } catch (error) {
        console.error(error);
        message.textContent =
            "Unable to send your request. Please try again.";

    } finally {
        button.disabled = false;
        button.textContent = "Send Reset Link";
    }
});
