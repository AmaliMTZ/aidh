import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 3000;

export const MERCHANT_ID = process.env.MERCHANT_ID;
export const USER = process.env.PAY_USER; // 👈 nombre seguro
export const PASSWORD = process.env.PASSWORD;
export const TERMINAL = process.env.TERMINAL;
export const BASE_URL = process.env.BASE_URL;

function validateEnv() {
  const missing = [];

  if (!MERCHANT_ID) missing.push("MERCHANT_ID");
  if (!USER) missing.push("PAY_USER");
  if (!PASSWORD) missing.push("PASSWORD");
  if (!TERMINAL) missing.push("TERMINAL");
  if (!BASE_URL) missing.push("BASE_URL");

  if (missing.length > 0) {
    console.error("Faltan variables de entorno:");
    missing.forEach(v => console.error(` - ${v}`));
    process.exit(1);
  }

  if (!BASE_URL.startsWith("https://")) {
    console.error("BASE_URL debe ser HTTPS");
    process.exit(1);
  }

  console.log("CONFIG OK:", {
    MERCHANT_ID,
    USER,
    TERMINAL
  });
}

validateEnv();