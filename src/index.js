import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

import paymentRoute from "./routes/payment.route.js";

import { PORT } from "./config.js";

const app = express();

// CONFIG PROXY (RENDER)
// ===============================
app.set("trust proxy", 1);

// SEGURIDAD
// ===============================
app.use(
  helmet({

    // ✅ NECESARIO PARA 3DS
    contentSecurityPolicy: false,

    // ✅ NECESARIO PARA IFRAMES BANORTE
    frameguard: false,

    crossOriginEmbedderPolicy: false
  })
);


// HEADERS
// ===============================
app.use((req, res, next) => {

  // ✅ HTTPS
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  // ✅ MIME
  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  next();
});


// RATE LIMIT
// ===============================
const limiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 100,

  standardHeaders: true,

  legacyHeaders: false
});

app.use(limiter);


// CORS
// ===============================
app.use(
  cors({

    origin: "*",

    methods: [
      "GET",
      "POST"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]
  })
);


// PARSERS
// ===============================

// ✅ IMPORTANTE PARA PAYWORKS
app.use(
  express.urlencoded({
    extended: true
  })
);

// ✅ JSON
app.use(express.json());

// LOGS
// ===============================
app.use(morgan("dev"));

// ESTÁTICOS
// ===============================
const __dirname = process.cwd();

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

// HOME
// ===============================
app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

// RUTAS
// ===============================
app.use(
  "/api/payment",
  paymentRoute
);

// TEST
// ===============================
app.get("/test", (req, res) => {

  res.status(200).send({
    success: true,
    message: "Servidor funcionando"
  });
});

// 404
// ===============================
app.use((req, res) => {

  res.status(404).send({
    success: false,
    message: "Ruta no encontrada"
  });
});

// ERROR GLOBAL
// ===============================
app.use((err, req, res, next) => {

  console.error(
    "\n===== ERROR GLOBAL ====="
  );

  console.error(err);

  res.status(500).send({
    success: false,
    message: "Error interno"
  });
});

// START
// ===============================
app.listen(PORT, () => {

  console.log(
    `Servidor corriendo en puerto ${PORT}`
  );
});
