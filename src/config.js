export const PORT = process.env.PORT || 3000;

export const MERCHANT_ID = process.env.MERCHANT_ID;
export const USER = process.env.USER;
export const PASSWORD = process.env.PASSWORD;
export const TERMINAL = process.env.TERMINAL;
export const BASE_URL = process.env.BASE_URL;

// Validaciones básicas
if (!BASE_URL) {
  console.error("BASE_URL no está definido");
}

if (!MERCHANT_ID || !USER || !PASSWORD || !TERMINAL) {
  console.error("Faltan credenciales de Banorte");
}