import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

import paymentRoute from "./routes/payment.route.js";
import { PORT } from "./config.js";

const app = express();

// ===============================
// CONFIG PROXY (RENDER)
// ===============================
app.set("trust proxy", 1);

// ===============================
// SEGURIDAD
// ===============================
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// headers seguros
app.use((req, res, next) => {
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");

  // ✔️ compatible con 3D Secure
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  next();
});

// ===============================
// RATE LIMIT
// ===============================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// ===============================
// CORS
// ===============================
app.use(
  cors({
    origin: "*", // puedes restringir luego
    methods: ["GET", "POST"],
  })
);

// ===============================
// PARSERS
// ===============================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===============================
// LOGS
// ===============================
app.use(morgan("dev"));

// ===============================
// ESTÁTICOS
// ===============================
const __dirname = process.cwd();
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// RUTAS
// ===============================
app.use("/api/payment", paymentRoute);

// ===============================
// TEST
// ===============================
app.get("/test", (req, res) => {
  res.send("Servidor funcionando");
});

// ===============================
// START
// ===============================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});