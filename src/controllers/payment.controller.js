// 🔐 INICIO 3D
export const start3DSecure = (req, res) => {
  const { nombre, correo, cardNumber, cardExp, cvv, amount } = req.body;

  const controlNumber = "ORD" + Date.now();

  global.paymentData = {
    nombre,
    correo,
    cardNumber,
    cardExp,
    cvv,
    amount,
    controlNumber
  };

  const data = {
    CARD_NUMBER: cardNumber,
    CARD_EXP: cardExp,
    AMOUNT: amount,
    CARD_TYPE: "VISA",

    MERCHANT_ID: process.env.MERCHANT_ID,
    MERCHANT_NAME: "ACADEMIA IDH",
    MERCHANT_CITY: "CDMX",

    REFERENCE3D: controlNumber,
    FORWARD_PATH: `${process.env.BASE_URL}/api/payment/3d-response`
  };

  res.send(`
    <form id="form" action="https://via.banorte.com/secure3d/Solucion3DSecure.htm" method="POST">
      ${Object.entries(data).map(([k,v]) => `<input type="hidden" name="${k}" value="${v}" />`).join("")}
    </form>
    <script>document.getElementById('form').submit();</script>
  `);
};

// 🔐 RESPUESTA 3D
export const handle3DResponse = (req, res) => {
  const { Status, ECI, CAVV, XID } = req.body;

  if (Status !== "200") {
    return res.send("❌ Autenticación 3D fallida");
  }

  global.paymentData = {
    ...global.paymentData,
    STATUS_3D: Status,
    ECI,
    CAVV,
    XID,
    VERSION_3D: "2"
  };

  res.redirect(`${process.env.BASE_URL}/api/payment/create-order`);
};

// 💳 PAGO
export const createOrder = (req, res) => {
  const p = global.paymentData;

  const data = {
    MERCHANT_ID: process.env.MERCHANT_ID,
    USER: process.env.USER_BANORTE,
    PASSWORD: process.env.PASSWORD_BANORTE,
    TERMINAL_ID: process.env.TERMINAL_ID,

    CMD_TRANS: "VENTA",
    AMOUNT: parseFloat(p.amount).toFixed(2),
    MODE: "AUT",
    CONTROL_NUMBER: p.controlNumber,

    CARD_NUMBER: p.cardNumber,
    CARD_EXP: p.cardExp,
    SECURITY_CODE: p.cvv,
    ENTRY_MODE: "MANUAL",

    CUSTOMER_REF1: p.nombre,
    CUSTOMER_REF2: p.correo,

    STATUS_3D: p.STATUS_3D,
    ECI: p.ECI,
    CAVV: p.CAVV,
    VERSION_3D: p.VERSION_3D,

    RESPONSE_URL: `${process.env.BASE_URL}/api/payment/success`
  };

  if (p.XID) data.XID = p.XID;

  res.send(`
    <form id="form" action="https://via.pagosbanorte.com/payw2" method="POST">
      ${Object.entries(data).map(([k,v]) => `<input type="hidden" name="${k}" value="${v}" />`).join("")}
    </form>
    <script>document.getElementById('form').submit();</script>
  `);
};

// ✅ SUCCESS
export const success = (req, res) => {
  const data = req.body;

  const result = data.PAYW_RESULT || data.RESULTADO_PAYW;

  switch (result) {
    case "A":
      return res.redirect("https://www.academiaidh.org.mx/respuesta-banorte?status=ok");
    case "D":
    case "R":
      return res.redirect("https://www.academiaidh.org.mx/respuesta-banorte?status=error");
    case "T":
      return res.redirect("https://www.academiaidh.org.mx/respuesta-banorte?status=timeout");
    case "Z":
      return res.redirect("https://www.academiaidh.org.mx/respuesta-banorte?status=reversal");
    default:
      return res.redirect("https://www.academiaidh.org.mx/respuesta-banorte?status=unknown");
  }
};