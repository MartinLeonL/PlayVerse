import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Verifying your email...");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");

    console.log("Token from URL:", token);

    if (!token) {
      setStatus("The verification token is missing.");
      return;
    }

    async function verifyEmail() {
      try {
        const response = await fetch(`${API_URL}/api/auth/verify-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
          }),
        });

        const data = await response.json();

        console.log("Verification response:", data);

        if (!response.ok) {
          throw new Error(data.message || "Email verification failed.");
        }

        setVerified(true);
        setStatus(data.message);
      } catch (error) {
        console.error(error);
        setStatus(error.message);
      }
    }

    verifyEmail();
  }, [searchParams]);

  return (
    <main>
      <h1>Email verification</h1>

      <p>{status}</p>

      {verified && <Link to="/">Return to login</Link>}
    </main>
  );
}

export default VerifyEmail;
