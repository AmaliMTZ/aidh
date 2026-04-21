import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import paymentRoute from "./routes/payment.route.js";
import { PORT } from "./config.js";

dotenv.config();

const app = express();

// 🔐 SEGURIDAD
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100 // límite de requests
});

app.use(limiter);

// 🔄 MIDDLEWARES
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan("dev"));

// 📂 SERVIR FRONTEND
app.use(express.static("public"));

// 🔥 RUTA PRINCIPAL (IMPORTANTE)
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

// 📌 RUTAS API
app.use("/api/payment", paymentRoute);

// 🧪 RUTA DE PRUEBA
app.get("/test", (req, res) => {
  res.send("Servidor funcionando correctamente ✅");
});

// 🚀 INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});