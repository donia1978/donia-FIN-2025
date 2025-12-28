import React, { useState } from "react";
import { downloadCertificatePdf } from "../../lib/certificateService";

export default function CertificatesPage() {
  const [studentName, setStudentName] = useState("Student Name");
  const [courseTitle, setCourseTitle] = useState("Course Title");
  const [teacherName, setTeacherName] = useState("DONIA");

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Certificats PDF</h2>
      <p style={{ opacity: 0.8 }}>GÃ©nÃ©ration locale via jsPDF</p>

      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label>
          Nom Ã©tudiant
          <input value={studentName} onChange={(e) => setStudentName(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>
        <label>
          Titre du cours
          <input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>
        <label>
          Formateur
          <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>

        <button
          onClick={() => downloadCertificatePdf({ studentName, courseTitle, teacherName })}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          TÃ©lÃ©charger PDF
        </button>
      </div>
    </div>
  );
}