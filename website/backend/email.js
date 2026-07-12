const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendVerificationEmail(email, token) {
  const verificationUrl =
    `${process.env.FRONTEND_URL}/verify-email` +
    `?token=${encodeURIComponent(token)}`;

  await sgMail.send({
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: "PlayVerse",
    },
    subject: "Verify your PlayVerse account",
    text: `Verify your account by visiting: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Verify your PlayVerse account</h2>

        <p>
          Click the button below to confirm your email address.
        </p>

        <a
          href="${verificationUrl}"
          style="
            display: inline-block;
            padding: 12px 20px;
            background: #6b46c1;
            color: white;
            border-radius: 8px;
            text-decoration: none;
          "
        >
          Verify email
        </a>

        <p>This link expires in one hour.</p>
      </div>
    `,
  });
}

module.exports = {
  sendVerificationEmail,
};