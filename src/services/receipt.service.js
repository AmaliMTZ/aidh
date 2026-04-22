import PDFDocument from "pdfkit";

export const generateReceiptPDF = (res, data) => {
  const doc = new PDFDocument({ margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=comprobante.pdf");

  doc.pipe(res);

  // TÍTULO
  doc.fontSize(18).text("COMPROBANTE DE PAGO", { align: "center" });
  doc.moveDown();

const now = new Date();

// convertir a hora México (UTC -6)
const fechaMexico = new Date(now.getTime() - (6 * 60 * 60 * 1000));

const fecha = fechaMexico.toLocaleString("es-MX", {
  dateStyle: "short",
  timeStyle: "medium"
});

  // DATOS
  doc.fontSize(12);
  doc.text(`Orden: ${data.controlNumber}`);
  doc.text(`Monto: $${data.amount}`);
  doc.text(`Fecha: ${fecha}`);
  doc.text(`Autorización: ${data.authCode}`);
  doc.text(`Referencia: ${data.reference}`);

  doc.moveDown();
  doc.text("Gracias por su compra.", { align: "center" });

  doc.end();
};