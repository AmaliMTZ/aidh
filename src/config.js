import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 3000;

export const MERCHANT_ID = process.env.MERCHANT_ID;
export const BANORTE_USER = process.env.BANORTE_USER;
export const BANORTE_PASSWORD = process.env.BANORTE_PASSWORD;
export const TERMINAL = process.env.TERMINAL;
export const BASE_URL = process.env.BASE_URL;

function validateEnv() {
  const missing = [];

  if (!MERCHANT_ID) missing.push("MERCHANT_ID");
  if (!BANORTE_USER) missing.push("BANORTE_USER");
  if (!BANORTE_PASSWORD) missing.push("BANORTE_PASSWORD");
  if (!TERMINAL) missing.push("TERMINAL");
  if (!BASE_URL) missing.push("BASE_URL");

  if (missing.length > 0) {
    console.error("Faltan variables de entorno:");
    missing.forEach(v => console.error(` - ${v}`));
    process.exit(1);
  }

  if (!/^https?:\/\//.test(BASE_URL)) {
    console.error("BASE_URL debe iniciar con http:// o https://");
    process.exit(1);
  }

  console.log("CONFIG OK:", {
    MERCHANT_ID,
    TERMINAL,
    BASE_URL
  });
}

validateEnv();