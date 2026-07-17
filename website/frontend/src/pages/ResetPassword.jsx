import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Lock, Eye, EyeOff } from "lucide-react";

import Logo from "../components/Logo.jsx";
import "./ResetPassword.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function ResetPassword() {
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError("This password-reset link is invalid.");
      return;
    }

    if (password.length < 8) {
      setError("The new password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to reset your password.");
      }

      setMessage(data.message);
      setPassword("");
      setConfirmPassword("");
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
          <h1>Reset password</h1>

          <form onSubmit={handleSubmit}>
            <label htmlFor="reset-password">New password</label>

            <div className="input-with-icon">
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter a new password"
                disabled={submitting}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label htmlFor="confirm-reset-password">Confirm new password</label>

            <div className="input-with-icon">
              <input
                id="confirm-reset-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm your new password"
                disabled={submitting}
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && <p className="form-error">{error}</p>}

            {message && <p className="form-success">{message}</p>}

            <button type="submit" disabled={submitting || !token}>
              {submitting ? "Resetting..." : "Reset password"}
            </button>
          </form>

          {message && <Link to="/login">Continue to login</Link>}
        </div>
      </section>
    </main>
  );
}

export default ResetPassword;
