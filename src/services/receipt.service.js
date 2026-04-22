import PDFDocument from "pdfkit";

export const generateReceiptPDF = (res, data) => {
  const doc = new PDFDocument({ margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=comprobante.pdf");

  doc.pipe(res);

  doc.fontSize(18).text("COMPROBANTE DE PAGO", { align: "center" });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Orden: ${data.controlNumber}`);
  doc.text(`Monto: $${data.amount}`);
  doc.text(`Fecha: ${new Date().toLocaleString()}`);
  doc.text(`Autorización: ${data.authCode}`);
  doc.text(`Referencia: ${data.reference}`);

  doc.moveDown();
  doc.text("Gracias por su compra.", { align: "center" });

  doc.end();
};