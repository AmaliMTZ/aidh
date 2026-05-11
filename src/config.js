import dotenv from "dotenv";

dotenv.config();


// ===============================
// VARIABLES DE ENTORNO
// ===============================
export const PORT =
  process.env.PORT || 3000;

export const MERCHANT_ID =
  process.env.MERCHANT_ID;

export const USER =
  process.env.USER;

export const PASSWORD =
  process.env.PASSWORD;

export const TERMINAL_ID =
  process.env.TERMINAL_ID;

export const BASE_URL =
  process.env.BASE_URL;


// ===============================
// VALIDAR VARIABLES
// ===============================
function validateEnv() {

  const missing = [];

  if (!MERCHANT_ID)
    missing.push("MERCHANT_ID");

  if (!USER)
    missing.push("USER");

  if (!PASSWORD)
    missing.push("PASSWORD");

  if (!TERMINAL_ID)
    missing.push("TERMINAL_ID");

  if (!BASE_URL)
    missing.push("BASE_URL");

  // ===============================
  // FALTANTES
  // ===============================
  if (missing.length > 0) {

    console.error(
      "\n Faltan variables de entorno:"
    );

    missing.forEach((v) =>
      console.error(` - ${v}`)
    );

    process.exit(1);
  }

  // ===============================
  // VALIDAR HTTPS
  // ===============================
  if (
    typeof BASE_URL !== "string" ||
    !BASE_URL.startsWith("https://")
  ) {

    console.error(
      "\n BASE_URL debe usar HTTPS"
    );

    process.exit(1);
  }

  // ===============================
  // VALIDAR TERMINAL
  // ===============================
  if (!/^\d+$/.test(TERMINAL_ID)) {

    console.error(
      "\n TERMINAL_ID inválida"
    );

    process.exit(1);
  }

  // ===============================
  // VALIDAR AFILIACIÓN
  // ===============================
  if (!/^\d+$/.test(MERCHANT_ID)) {

    console.error(
      "\n MERCHANT_ID inválido"
    );

    process.exit(1);
  }

  // ===============================
  // CONFIG OK
  // ===============================
  console.log("\n CONFIG OK");

  console.log({
    MERCHANT_ID,
    USER,
    TERMINAL_ID,
    BASE_URL
  });
}


// ===============================
// EJECUTAR VALIDACIÓN
// ===============================
validateEnv();
