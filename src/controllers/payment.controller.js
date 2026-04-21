<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Pago seguro</title>

<style>
body {
  font-family: Arial;
  background: #6a1b9a;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}

.container {
  background: white;
  padding: 20px;
  border-radius: 10px;
  width: 300px;
}

input {
  width: 100%;
  padding: 10px;
  margin: 5px 0;
}

button {
  width: 100%;
  padding: 10px;
  background: purple;
  color: white;
}
</style>
</head>

<body>

<div class="container">
  <h3>Pago</h3>

  <!-- 🔥 SIN action -->
  <form id="formPago">

    <input name="nombre" placeholder="Nombre" required>
    <input name="correo" placeholder="Correo" required>

    <input id="cardNumber" placeholder="Tarjeta" required>
    <input id="cardExp" placeholder="MM/AA" required>
    <input id="cvv" type="password" placeholder="CVV" required>
    <input id="amount" placeholder="Monto" required>

    <button type="submit">Pagar</button>

  </form>
</div>

<script>
window.onload = () => {

  const form = document.getElementById("formPago");

  if (!form) {
    alert("Formulario no encontrado");
    return;
  }

  form.onsubmit = async (e) => {
    e.preventDefault(); // 🔥 CLAVE

    const data = {
      nombre: form.nombre.value,
      correo: form.correo.value,
      cardNumber: document.getElementById("cardNumber").value,
      cardExp: document.getElementById("cardExp").value.replace("/", ""),
      cvv: document.getElementById("cvv").value,
      amount: document.getElementById("amount").value
    };

    try {
      const res = await fetch("/api/payment/3d-secure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const html = await res.text();

      document.open();
      document.write(html);
      document.close();

    } catch (error) {
      alert("Error al procesar pago");
    }
  };

};
</script>

</body>
</html>