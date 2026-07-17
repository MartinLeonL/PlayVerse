import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./VerifyEmail.css";

function VerifyEmail() {
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState(
    "Verifying your email..."
  );

  const verificationStarted = useRef(false);

  useEffect(() => {
    // Prevent React development mode from sending the request twice.
    if (verificationStarted.current) {
      return;
    }

    verificationStarted.current = true;

    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("This verification link is invalid.");
      return;
    }

    async function verifyEmail() {
      try {
        const response = await fetch(
          "http://localhost:5000/api/auth/verify-email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "This verification link is invalid."
          );
        }

        setStatus("success");
        setMessage(
          data.message ||
            "Your email has been verified successfully."
        );
      } catch (error) {
        setStatus("error");
        setMessage(error.message);
      }
    }

    verifyEmail();
  }, [searchParams]);

  return (
    <main className="verify-email-page">
      <h1>Email verification</h1>

      <p className={`verification-message ${status}`}>
        {message}
      </p>
    </main>
  );
}

export default VerifyEmail;