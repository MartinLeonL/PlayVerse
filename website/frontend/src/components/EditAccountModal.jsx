import { useState } from "react";
import { X, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

import "./AccountModal.css";

function EditAccountModal({
  user,
  onCancel,
  onSave,
  saving = false,
  serverError = "",
}) {
  const [firstName, setFirstName] = useState(user.firstName || "");

  const [lastName, setLastName] = useState(user.lastName || "");

  const [username, setUsername] = useState(user.username || "");

  const [email, setEmail] = useState(user.email || "");

  const [reviewDisplayPreference, setReviewDisplayPreference] = useState(
    user.reviewDisplayPreference || "fullName",
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [validationError, setValidationError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setValidationError("");

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedUsername ||
      !trimmedEmail
    ) {
      setValidationError(
        "First name, last name, username, and email are required.",
      );
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      setValidationError(
        "Username must be 3-20 characters, letters/numbers/underscores only.",
      );
      return;
    }

    if (password && password.length < 8) {
      setValidationError(
        "The new password must contain at least 8 characters.",
      );
      return;
    }

    if (password && !currentPassword) {
      setValidationError("Enter your current password to set a new one.");
      return;
    }

    const updatedAccount = {
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      username: trimmedUsername,
      email: trimmedEmail,
      reviewDisplayPreference,
    };

    // Only send password fields when the user actually entered one.
    if (password) {
      updatedAccount.password = password;
      updatedAccount.currentPassword = currentPassword;
    }

    await onSave(updatedAccount);
  }

  function handleClose() {
    if (!saving) {
      onCancel();
    }
  }

  return (
    <div className="account-modal-overlay" onClick={handleClose}>
      <div
        className="account-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="account-modal-close"
          onClick={handleClose}
          aria-label="Close"
          disabled={saving}
        >
          <X size={16} />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="account-modal-row">
            <div className="account-modal-field">
              <label htmlFor="firstName">First Name</label>

              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={saving}
                required
              />
            </div>

            <div className="account-modal-field">
              <label htmlFor="lastName">Last Name</label>

              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={saving}
                required
              />
            </div>
          </div>

          <div className="account-modal-field full">
            <label htmlFor="username">Username</label>

            <div className="account-modal-input-icon">
              <User size={15} />

              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={saving}
                required
              />
            </div>
          </div>

          <div className="account-modal-field full">
            <label htmlFor="email">Email</label>

            <div className="account-modal-input-icon">
              <Mail size={15} />

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={saving}
                required
              />
            </div>
          </div>

          <div className="account-modal-field full">
            <label>Show on my reviews</label>

            <div className="account-modal-radio-group">
              <label className="account-modal-radio-option">
                <input
                  type="radio"
                  name="reviewDisplayPreference"
                  value="fullName"
                  checked={reviewDisplayPreference === "fullName"}
                  onChange={() => setReviewDisplayPreference("fullName")}
                  disabled={saving}
                />
                Full name ({firstName} {lastName})
              </label>

              <label className="account-modal-radio-option">
                <input
                  type="radio"
                  name="reviewDisplayPreference"
                  value="username"
                  checked={reviewDisplayPreference === "username"}
                  onChange={() => setReviewDisplayPreference("username")}
                  disabled={saving}
                />
                Username (@{username})
              </label>
            </div>
          </div>

          <div className="account-modal-field full">
            <label htmlFor="currentPassword">
              Current Password (required to change password)
            </label>

            <div className="account-modal-input-icon">
              <Lock size={15} />

              <input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={saving}
              />

              <button
                type="button"
                className="account-modal-toggle"
                onClick={() => setShowCurrentPassword((current) => !current)}
                aria-label={
                  showCurrentPassword ? "Hide password" : "Show password"
                }
                disabled={saving}
              >
                {showCurrentPassword ? (
                  <EyeOff size={15} />
                ) : (
                  <Eye size={15} />
                )}
              </button>
            </div>
          </div>

          <div className="account-modal-field full">
            <label htmlFor="newPassword">New Password</label>

            <div className="account-modal-input-icon">
              <Lock size={15} />

              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Insert a new password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={saving}
              />

              <button
                type="button"
                className="account-modal-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={saving}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {validationError && (
            <p className="account-modal-error">{validationError}</p>
          )}

          {serverError && <p className="account-modal-error">{serverError}</p>}

          <div className="account-modal-actions">
            <button
              type="button"
              className="account-modal-cancel"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="account-modal-save"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditAccountModal;