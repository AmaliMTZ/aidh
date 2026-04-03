// Crear orden (envía a Banorte)
export const createOrder = (req, res) => {

  const { nombre, correo } = req.query;

  const data = {
    MERCHANT_ID: process.env.MERCHANT_ID,
    USER: process.env.USER_BANORTE,
    PASSWORD: process.env.PASSWORD_BANORTE,
    TERMINAL_ID: process.env.TERMINAL_ID,
    CMD_TRANS: "VENTA",
    AMOUNT: "100.00",
    MODE: "AUT", //cambiar despues de las pruebas
    
    CONTROL_NUMBER: "ORD" + Date.now(),

    CUSTOMER_REF1: nombre || "Sin nombre",
    CUSTOMER_REF2: correo || "Sin correo",

    RESPONSE_URL: `${process.env.BASE_URL}/success`
  };

  res.send(`
    <html>
      <body>
        <h2>Redirigiendo a Banorte...</h2>

        <form id="form" action="https://via.pagosbanorte.com/payw2" method="POST">

          <input type="hidden" name="MERCHANT_ID" value="${data.MERCHANT_ID}" />
          <input type="hidden" name="USER" value="${data.USER}" />
          <input type="hidden" name="PASSWORD" value="${data.PASSWORD}" />
          <input type="hidden" name="TERMINAL_ID" value="${data.TERMINAL_ID}" />
          <input type="hidden" name="CMD_TRANS" value="${data.CMD_TRANS}" />
          <input type="hidden" name="AMOUNT" value="${data.AMOUNT}" />
          <input type="hidden" name="MODE" value="${data.MODE}" />
          <input type="hidden" name="CONTROL_NUMBER" value="${data.CONTROL_NUMBER}" />
          <input type="hidden" name="CUSTOMER_REF1" value="${data.CUSTOMER_REF1}" />
          <input type="hidden" name="CUSTOMER_REF2" value="${data.CUSTOMER_REF2}" />
          <input type="hidden" name="RESPONSE_URL" value="${data.RESPONSE_URL}" />

        </form>

        <script>
          document.getElementById('form').submit();
        </script>

      </body>
    </html>
  `);
};


// Recibir respuesta del banco
export const success = (req, res) => {

  console.log("Query:", req.query);
  console.log("Body:", req.body);

  const data = req.method === "POST" ? req.body : req.query;

  const result = data.PAYW_RESULT || data.RESULTADO_PAYW;

  if (result === "A") {
    res.send(`
      <html>
        <body>
          <h1>Pago aprobado</h1>
          <p>Gracias por tu pago</p>
        </body>
      </html>
    `);
  } else if (result === "D") {
    res.send(`
      <html>
        <body>
          <h1>Pago declinado</h1>
          <p>Intenta nuevamente</p>
        </body>
      </html>
    `);
  } else if (result === "R") {
    res.send(`
      <html>
        <body>
          <h1>Pago rechazado</h1>
          <p>Verifica tus datos</p>
        </body>
      </html>
    `);
  } else {
    res.send("Sin resultado o prueba");
  }
};