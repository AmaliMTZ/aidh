import PDFDocument from "pdfkit";

export const generateReceiptPDF = (res, data) => {
  const doc = new PDFDocument({ margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=comprobante.pdf");

  doc.pipe(res);

  // TÍTULO
  doc.fontSize(18).text("COMPROBANTE DE PAGO", { align: "center" });
  doc.moveDown();

  // FECHA CORREGIDA A MÉXICO
  const fecha = new Date().toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
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