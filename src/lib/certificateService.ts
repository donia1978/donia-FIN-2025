import { jsPDF } from "jspdf";

export type CertificatePayload = {
  studentName: string;
  courseTitle: string;
  teacherName?: string;
  dateISO?: string;
};

export function buildCertificatePdf(p: CertificatePayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const date = p.dateISO ? new Date(p.dateISO) : new Date();
  const dateStr = date.toLocaleDateString();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("CERTIFICAT", 105, 30, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Ce certificat atteste que :", 20, 55);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(p.studentName || "â€”", 20, 70);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("a complÃ©tÃ© le cours :", 20, 85);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(p.courseTitle || "â€”", 20, 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Date : ${dateStr}`, 20, 120);

  if (p.teacherName) {
    doc.text(`Formateur : ${p.teacherName}`, 20, 130);
  }

  doc.setFontSize(10);
  doc.text("DONIA â€” Document gÃ©nÃ©rÃ© automatiquement (validation humaine recommandÃ©e).", 20, 280);

  return doc;
}

export function downloadCertificatePdf(p: CertificatePayload) {
  const doc = buildCertificatePdf(p);
  const safeName = (p.studentName || "student").replace(/[^\w\-]+/g, "_");
  doc.save(`DONIA_Certificat_${safeName}.pdf`);
}