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
    .fontSize(16)
    .text("AIDH", { align: "center" });

  doc.fontSize(12).text("COMPROBANTE DE PAGO", { align: "center" });

  doc.moveDown(2);

  // ===== FECHA =====
  const now = new Date();
  const fechaMexico = new Date(now.getTime() - (6 * 60 * 60 * 1000));

  const fecha = fechaMexico.toLocaleDateString("es-MX");
  const hora = fechaMexico.toLocaleTimeString("es-MX");

  // ===== DATOS PRINCIPALES =====
  doc.fontSize(11);

  doc.text(`Folio: ${data.controlNumber}`);
  doc.text(`Fecha: ${fecha}`);
  doc.text(`Hora: ${hora}`);

  doc.moveDown();

  doc.text(`Referencia: ${data.reference}`);
  doc.text(`Código de autorización: ${data.authCode}`);

  doc.moveDown();

  doc.text(`Monto: $${amount.toFixed(2)} MXN`);

  doc.moveDown(2);

  // ===== LÍNEA =====
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

  doc.moveDown(2);

  // ===== DESCRIPCIÓN =====
  doc.text("Descripción del pago:");
  doc.text("Pago realizado a través de plataforma electrónica autorizada.");

  doc.moveDown(2);

  doc.text("Método de pago:");
  doc.text("Tarjeta bancaria (procesado mediante pasarela segura)");

  doc.moveDown(3);

  // ===== FIRMA =====
  doc.text("____________________________________", { align: "center" });
  doc.text("Validación del sistema", { align: "center" });

  doc.moveDown(2);

  // ===== LEYENDA LEGAL =====
  doc
    .fontSize(9)
    .fillColor("gray")
    .text(
      "Este documento es un comprobante institucional de pago. No constituye un comprobante fiscal digital (CFDI). Para efectos fiscales, solicite su factura correspondiente.",
      { align: "justify" }
    );

  doc.fillColor("black");

  doc.end();
};