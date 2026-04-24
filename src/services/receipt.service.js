import PDFDocument from "pdfkit";

// ===============================
// GENERAR PDF
// ===============================
export const generateReceiptPDF = (res, data) => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=comprobante.pdf");

  doc.pipe(res);

  const amount = Number(data.amount);

  // ===============================
  // ENCABEZADO
  // ===============================
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("COMPROBANTE DE PAGO VIA INTERNET", { align: "center" });

  doc.moveDown();

  doc.fontSize(10);
  doc.text(
    `FOLIO DE PAGO: ${String(data.controlNumber).padStart(10, "0")}`,
    { align: "right" }
  );

  doc.moveDown(2);

  let y = doc.y;

  // ===============================
  // REFERENCIA
  // ===============================
  doc.font("Helvetica-Bold").text("Referencia:", 50, y);
  doc.font("Helvetica").text(
    String(data.reference).padStart(15, "0"),
    50,
    y + 15
  );

  doc.font("Helvetica-Bold").text("Transacción:", 300, y);
  doc.font("Helvetica").text(data.controlNumber, 300, y + 15);

  y += 50;

  // ===============================
  // FECHA CORRECTA (México)
  // ===============================
  const fecha = new Date().toLocaleDateString("es-MX", {
    timeZone: "America/Mexico_City"
  });

  const hora = new Date().toLocaleTimeString("es-MX", {
    timeZone: "America/Mexico_City"
  });

  doc.text(`Fecha de pago: ${fecha}`, 50, y);
  doc.text(`Hora: ${hora}`, 50, y + 15);

  y += 50;

  // ===============================
  // DATOS
  // ===============================
  doc.text(`Autorización: ${data.authCode}`, 50, y);
  doc.text(`Importe: $${amount.toFixed(2)}`, 50, y + 15);
  doc.text(`Total Cobrado: $${amount.toFixed(2)}`, 50, y + 30);

  y += 60;

  // ===============================
  // MÉTODO DE PAGO
  // ===============================
  const tipoPago =
    data.tipoTarjeta === "DB"
      ? "Tarjeta de Débito"
      : "Tarjeta de Crédito";

  doc.text(`Tipo de instrumento de pago: ${tipoPago}`, 50, y);
  doc.text(`Folio de instrumento: ${data.controlNumber}`, 50, y + 15);

  y += 60;

  // ===============================
  // LÍNEA
  // ===============================
  doc.moveTo(50, y).lineTo(550, y).stroke();

  y += 20;

  // ===============================
  // CANTIDAD CON LETRA
  // ===============================
  doc.font("Helvetica-Bold").text(
    `Cantidad con letra (${numeroALetras(amount)} PESOS ${centavos(amount)}/100 M.N.)`,
    50,
    y
  );

  y += 40;

  // ===============================
  // CADENA (SIMULADA)
  // ===============================
  doc.fontSize(8).font("Helvetica");
  doc.text("Cadena de validación:", 50, y);
  doc.text(
    "xFZksBcUeIEnVFqTZUQa==nARKNvSW0Bvmra8yhpzA==WB6IIG8A0...",
    50,
    y + 15,
    { width: 500 }
  );

  y += 60;

  // ===============================
  // LEYENDA
  // ===============================
  doc
    .fontSize(8)
    .fillColor("gray")
    .text(
      "Este documento es un comprobante institucional emitido por la institución educativa y no constituye un comprobante fiscal oficial (CFDI). Para efectos fiscales, solicite su factura correspondiente.",
      50,
      y,
      { align: "justify" }
    );

  doc.fillColor("black");

  doc.end();
};


// ===============================
// FUNCIONES AUXILIARES
// ===============================

function centavos(num) {
  return Math.round((num % 1) * 100)
    .toString()
    .padStart(2, "0");
}


// ===============================
// NUMERO A LETRAS (MEJORADO)
// ===============================
function numeroALetras(num) {
  num = Math.floor(num);

  const unidades = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const especiales = ["DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISÉIS","DIECISIETE","DIECIOCHO","DIECINUEVE"];
  const decenas = ["", "", "VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"];
  const centenas = ["", "CIENTO","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS","SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];

  if (num === 0) return "CERO";
  if (num === 100) return "CIEN";

  if (num < 10) return unidades[num];

  if (num < 20) return especiales[num - 10];

  if (num < 100) {
    const d = Math.floor(num / 10);
    const u = num % 10;
    return decenas[d] + (u ? " Y " + unidades[u] : "");
  }

  if (num < 1000) {
    const c = Math.floor(num / 100);
    const resto = num % 100;
    return centenas[c] + (resto ? " " + numeroALetras(resto) : "");
  }

  if (num < 1000000) {
    const miles = Math.floor(num / 1000);
    const resto = num % 1000;
    return (miles === 1 ? "MIL" : numeroALetras(miles) + " MIL") +
      (resto ? " " + numeroALetras(resto) : "");
  }

  return num.toString();
}