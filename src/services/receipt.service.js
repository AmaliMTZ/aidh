import PDFDocument from "pdfkit";

// ===============================
// CONVERSIÓN SIMPLE A TEXTO
// ===============================
const numeroALetras = (num) => {
  return `${num.toFixed(2)}`;
};

const centavos = (num) => {
  return Math.round((num % 1) * 100);
};


// ===============================
// GENERAR PDF
// ===============================
export const generateReceiptPDF = (res, data) => {
  const doc = new PDFDocument({ margin: 50 });

  doc.on("error", (err) => {
    console.error("PDF error:", err);
    res.status(500).end();
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=comprobante.pdf");

  doc.pipe(res);

  // ===============================
  // DATOS SEGUROS
  // ===============================
  const amount = Number(data.amount) || 0;
  const control = data.controlNumber || "N/A";
  const reference = data.reference || "N/A";
  const authCode = data.authCode || "N/A";

  const tipoPago =
    data.tipoTarjeta === "DB"
      ? "Tarjeta de Débito"
      : data.tipoTarjeta === "CR"
      ? "Tarjeta de Crédito"
      : "Tarjeta";

  const now = new Date();

  const fecha = now.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const hora = now.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  // cadena real simple
  const cadena = `${control}|${amount}|${authCode}|${reference}`;

  // ===============================
  // HEADER
  // ===============================
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("COMPROBANTE DE PAGO VIA INTERNET", { align: "center" });

  doc.moveDown();

  doc
    .fontSize(10)
    .text(`FOLIO DE PAGO: ${String(control).padStart(10, "0")}`, {
      align: "right"
    });

  doc.moveDown(2);

  // ===============================
  // BLOQUES
  // ===============================
  let y = doc.y;

  doc.font("Helvetica-Bold").text("Referencia:", 50, y);
  doc.font("Helvetica").text(String(reference).padStart(15, "0"), 50, y + 15);

  doc.font("Helvetica-Bold").text("Transacción:", 300, y);
  doc.font("Helvetica").text(control, 300, y + 15);

  y += 50;

  doc.text(`Fecha de pago: ${fecha}`, 50, y);
  doc.text(`Hora: ${hora}`, 50, y + 15);

  y += 50;

  doc.text(`Autorización: ${authCode}`, 50, y);
  doc.text(`Importe: $${amount.toFixed(2)}`, 50, y + 15);
  doc.text(`Total Cobrado: $${amount.toFixed(2)}`, 50, y + 30);

  y += 60;

  doc.text(`Tipo de instrumento de pago: ${tipoPago}`, 50, y);
  doc.text(`Folio de instrumento: ${control}`, 50, y + 15);

  y += 60;

  // ===============================
  // LÍNEA
  // ===============================
  doc.moveTo(50, y).lineTo(550, y).stroke();

  y += 20;

  // ===============================
  // MONTO EN LETRA
  // ===============================
  doc
    .font("Helvetica-Bold")
    .text(
      `Cantidad con letra (${numeroALetras(amount)} PESOS ${centavos(amount)}/100 M.N.)`,
      50,
      y
    );

  y += 40;

  // ===============================
  // CADENA
  // ===============================
  doc.fontSize(8).font("Helvetica");

  doc.text("Cadena de validación:", 50, y);
  doc.text(cadena, 50, y + 15, { width: 500 });

  y += 60;

  // ===============================
  // DISCLAIMER
  // ===============================
  doc
    .fontSize(8)
    .fillColor("gray")
    .text(
      "Este documento es un comprobante institucional de pago realizado a través de medios electrónicos. Para cualquier aclaración, conserve este comprobante y contacte al establecimiento correspondiente.",
      50,
      y,
      { align: "justify" }
    );

  doc.end();
};