import PDFDocument from "pdfkit";

export const generateReceiptPDF = (res, data) => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=comprobante.pdf");

  doc.pipe(res);

  const amount = Number(data.amount);

  // ===== ENCABEZADO =====
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("COMPROBANTE DE PAGO VIA INTERNET", { align: "center" });

  doc.moveDown();

  // ===== FOLIO DERECHA =====
  doc.fontSize(10);
  doc.text(`FOLIO DE PAGO: ${String(data.controlNumber).padStart(10, "0")}`, {
    align: "right"
  });

  doc.moveDown(2);

  let y = doc.y;

  // ===== BLOQUE PRINCIPAL =====
  doc.font("Helvetica-Bold").text("Referencia:", 50, y);
  doc.font("Helvetica").text(
    String(data.reference).padStart(15, "0"),
    50,
    y + 15
  );

  doc.font("Helvetica-Bold").text("Transacción:", 300, y);
  doc.font("Helvetica").text(data.controlNumber, 300, y + 15);

  y += 50;

  // ===== FECHA =====
  const now = new Date();
  const fechaMexico = new Date(now.getTime() - (6 * 60 * 60 * 1000));

  const fecha = fechaMexico.toLocaleDateString("es-MX");
  const hora = fechaMexico.toLocaleTimeString("es-MX");

  doc.text(`Fecha de pago: ${fecha}`, 50, y);
  doc.text(`Hora: ${hora}`, 50, y + 15);

  y += 50;

  // ===== DATOS =====
  doc.text(`Autorización: ${data.authCode}`, 50, y);
  doc.text(`Importe: $${amount.toFixed(2)}`, 50, y + 15);
  doc.text(`Total Cobrado: $${amount.toFixed(2)}`, 50, y + 30);

  y += 60;

  // ===== MÉTODO =====
  doc.text("Tipo de instrumento de pago: Tarjeta de Crédito", 50, y);
  doc.text(`Folio de instrumento: ${data.controlNumber}`, 50, y + 15);

  y += 60;

  // ===== LÍNEA =====
  doc.moveTo(50, y).lineTo(550, y).stroke();

  y += 20;

  // ===== CANTIDAD CON LETRA =====
  doc.font("Helvetica-Bold").text(
    `Cantidad con letra (${numeroALetras(amount)} PESOS ${centavos(amount)}/100 M.N.)`,
    50,
    y
  );

  y += 40;

  // ===== CADENA (SIMULADA) =====
  doc.fontSize(8).font("Helvetica");
  doc.text("Cadena de validación:", 50, y);
  doc.text("xFZksBcUeIEnVFqTZUQa==nARKNvSW0Bvmra8yhpzA==WB6IIG8A0...", 50, y + 15, {
    width: 500
  });

  y += 60;

  // ===== LEYENDA (LO QUE PEDISTE) =====
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


// ===== FUNCIONES =====

function centavos(num) {
  return Math.round((num % 1) * 100).toString().padStart(2, "0");
}

function numeroALetras(num) {
  num = Math.floor(num);

  const unidades = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];

  if (num < 10) return unidades[num];

  if (num < 20) return "DIECI" + unidades[num - 10].toLowerCase();

  if (num < 100) {
    const d = Math.floor(num / 10);
    const u = num % 10;
    return decenas[d] + (u ? " Y " + unidades[u] : "");
  }

  if (num < 1000) {
    const c = Math.floor(num / 100);
    const resto = num % 100;

    const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

    return centenas[c] + (resto ? " " + numeroALetras(resto) : "");
  }

  return num;
}