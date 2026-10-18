
import { supabase } from "./authorise.js";

const registerForm = document.getElementById("registerForm");
const registerButton = registerForm.querySelector('button[type="submit"]');

// Create an account. Manager is needed
registerForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!name || !email) {
        alert("Please complete your details.");
        return;
    }

    if (password.length < 6) {
        alert("Your password must be at least 6 characters.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = "Creating Account...";

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name
                },
                emailRedirectTo: new URL(
                    "login.html",
                    window.location.href
                ).href
            }
        });

        if (error) {
            alert(error.message);
            return;
        }

        if (data.session) {
            alert("Account created successfully.");
        } else {
            alert(
                "Registration received. If the address is eligible, " +
                "check your email for a confirmation link."
            );
        }

        window.location.href = "login.html";

    } catch (error) {
        console.error(error);
        alert("Unable to connect. Please try again.");
    } finally {
        registerButton.disabled = false;
        registerButton.textContent = "Create Account";
    }
});
