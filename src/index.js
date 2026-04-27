import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";

import paymentRoute from "./routes/payment.route.js";
import { PORT } from "./config.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(morgan("dev"));

app.use("/api/payment", paymentRoute);

app.get("/", (req, res) => {
  res.send("Servidor funcionando");
});

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});