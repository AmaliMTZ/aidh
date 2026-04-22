import PDFDocument from "pdfkit";

export const generateReceiptPDF = (res, data) => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=comprobante.pdf");

  doc.pipe(res);

  //  NORMALIZAR MONTO
  const amount = Number(data.amount);

  // ===== ENCABEZADO =====
  doc
    .fontSize(14)
    .text("COMPROBANTE DE PAGO VIA INTERNET", { align: "center" });

  doc.moveDown(2);

  // ===== FOLIO =====
  doc.fontSize(10);
  doc.text(`FOLIO DE PAGO: ${data.controlNumber}`, { align: "right" });

  doc.moveDown(2);

  // ===== COLUMNAS =====
  const leftX = 50;
  const rightX = 300;
  let y = doc.y;

  doc.font("Helvetica-Bold").text("Referencia:", leftX, y);
  doc.font("Helvetica").text(data.reference, leftX, y + 15);

  doc.font("Helvetica-Bold").text("Transacción:", rightX, y);
  doc.font("Helvetica").text(data.controlNumber, rightX, y + 15);

  y += 50;

  // ===== FECHA MÉXICO =====
  const now = new Date();
  const fechaMexico = new Date(now.getTime() - (6 * 60 * 60 * 1000));

  const fecha = fechaMexico.toLocaleDateString("es-MX");
  const hora = fechaMexico.toLocaleTimeString("es-MX");

  doc.text(`Fecha de pago: ${fecha}`, leftX, y);
  doc.text(`Hora: ${hora}`, leftX, y + 15);

  y += 50;

  // ===== DATOS DE PAGO =====
  doc.text(`Autorización: ${data.authCode}`, leftX, y);
  doc.text(`Importe: $${amount.toFixed(2)}`, leftX, y + 15);
  doc.text(`Total Cobrado: $${amount.toFixed(2)}`, leftX, y + 30);

  y += 70;

  // ===== TEXTO EXTRA =====
  doc.text("Tipo de instrumento de pago: Tarjeta de Crédito", leftX, y);
  doc.text(`Folio de instrumento: ${data.controlNumber}`, leftX, y + 15);

  y += 60;

  // ===== LÍNEA =====
  doc.moveTo(50, y).lineTo(550, y).stroke();

  y += 20;

  // ===== CANTIDAD CON LETRA =====
  doc.text(
    `Cantidad con letra: ${numeroALetras(amount)} PESOS 00/100 M.N.`,
    leftX,
    y
  );

  y += 40;

  // ===== CADENA =====
  doc.fontSize(8).text("HASH / CADENA DE SEGURIDAD:", leftX, y);
  doc.text("xFZksBcUeIEnVFq...simulado...", leftX, y + 15);

  y += 50;

  doc.fontSize(10).text("Gracias por su compra.", { align: "center" });

  doc.end();
};


//  FUNCIÓN MEJORADA
function numeroALetras(num) {
  num = Math.floor(num);

  const unidades = [
    "", "UN", "DOS", "TRES", "CUATRO", "CINCO",
    "SEIS", "SIETE", "OCHO", "NUEVE"
  ];

  const decenas = [
    "", "DIEZ", "VEINTE", "TREINTA", "CUARENTA",
    "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"
  ];

  const especiales = {
    11: "ONCE",
    12: "DOCE",
    13: "TRECE",
    14: "CATORCE",
    15: "QUINCE"
  };

  if (num <= 9) return unidades[num];

  if (num >= 11 && num <= 15) return especiales[num];

  if (num <= 99) {
    const d = Math.floor(num / 10);
    const u = num % 10;
    return decenas[d] + (u ? " Y " + unidades[u] : "");
  }

  if (num === 100) return "CIEN";

  if (num < 200) return "CIENTO " + numeroALetras(num - 100);

  return num; // puedes expandir luego
}