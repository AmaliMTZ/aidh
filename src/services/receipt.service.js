export const generateReceiptPDF = (res, data) => {
  const doc = new PDFDocument({ margin: 50 });

  doc.on("error", (err) => {
    console.error("PDF error:", err);
    res.status(500).end();
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=comprobante.pdf");

  doc.pipe(res);

  const amount = Number(data.amount) || 0;
  const control = data.controlNumber || "N/A";
  const reference = data.reference || "N/A";
  const authCode = data.authCode || "N/A";

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("COMPROBANTE DE PAGO VIA INTERNET", { align: "center" });

  doc.moveDown();

  doc.fontSize(10);
  doc.text(
    `FOLIO DE PAGO: ${String(control).padStart(10, "0")}`,
    { align: "right" }
  );
  doc.moveDown(2);

  let y = doc.y;

  doc.font("Helvetica-Bold").text("Referencia:", 50, y);
  doc.font("Helvetica").text(
    String(reference).padStart(15, "0"),
    50,
    y + 15
  );

  doc.font("Helvetica-Bold").text("Transacción:", 300, y);
  doc.font("Helvetica").text(control, 300, y + 15);

  y += 50;

  const fecha = new Date().toLocaleDateString("es-MX", {
    timeZone: "America/Mexico_City"
  });

  const hora = new Date().toLocaleTimeString("es-MX", {
    timeZone: "America/Mexico_City"
  });

  doc.text(`Fecha de pago: ${fecha}`, 50, y);
  doc.text(`Hora: ${hora}`, 50, y + 15);

  y += 50;

  doc.text(`Autorización: ${authCode}`, 50, y);
  doc.text(`Importe: $${amount.toFixed(2)}`, 50, y + 15);
  doc.text(`Total Cobrado: $${amount.toFixed(2)}`, 50, y + 30);

  y += 60;

  const tipoPago =
    data.tipoTarjeta === "DB"
      ? "Tarjeta de Débito"
      : "Tarjeta de Crédito";

  doc.text(`Tipo de instrumento de pago: ${tipoPago}`, 50, y);
  doc.text(`Folio de instrumento: ${control}`, 50, y + 15);

  y += 60;

  doc.moveTo(50, y).lineTo(550, y).stroke();

  y += 20;

  doc.font("Helvetica-Bold").text(
    `Cantidad con letra (${numeroALetras(amount)} PESOS ${centavos(amount)}/100 M.N.)`,
    50,
    y
  );

  y += 40;

  doc.fontSize(8).font("Helvetica");
  doc.text("Cadena de validación:", 50, y);
  doc.text(
    "xFZksBcUeIEnVFqTZUQa==nARKNvSW0Bvmra8yhpzA==WB6IIG8A0...",
    50,
    y + 15,
    { width: 500 }
  );

  y += 60;

  doc
    .fontSize(8)
    .fillColor("gray")
    .text(
      "Este documento es un comprobante institucional...",
      50,
      y,
      { align: "justify" }
    );

  doc.end();
};