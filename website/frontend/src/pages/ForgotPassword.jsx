import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

import Logo from "../components/Logo.jsx";
import "./ForgotPassword.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setMessage("");
      setError("");

      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to request a password reset.");
      }

      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-section">

        <div className="login-form-container">
          <h1>Forgot password?</h1>

          <p>
            Enter your email address and we will send you a password-reset link.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="forgot-email">Email</label>

            <div className="input-with-icon">

              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                disabled={submitting}
                required
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            {message && <p className="form-success">{message}</p>}

            <button type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <Link to="/login">Return to login</Link>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;
