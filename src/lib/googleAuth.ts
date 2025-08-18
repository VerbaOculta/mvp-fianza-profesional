import { GoogleAuth } from "google-auth-library";

export function getGoogleAuth() {
  const b64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64;
  if (!b64) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64");
  }

  let credentials;
  try {
    const raw = Buffer.from(b64, "base64").toString("utf8");
    credentials = JSON.parse(raw);
  } catch (err) {
    throw new Error("Invalid base64 credentials: " + (err as Error).message);
  }

  return new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
}
