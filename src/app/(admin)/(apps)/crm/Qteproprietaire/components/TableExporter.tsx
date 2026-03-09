// ✅ src/utils/TableExporter.ts

import * as XLSX from "xlsx";

// Type CustomerType tel que défini dans le composant Qteclient
interface CustomerType {
  _id?: string;
  nomPrenom: string;
  dateCreation: string;
  nombreCaisses?: number;
  quantiteOlive?: number;
  quantiteHuile?: number;
  quantiteOliveNet?: number;
  kattou3?: number;
  nisba?: number;
}

// 📍 Informations société
const COMPANY_INFO = {
  name: "Huillerie bouchema",
  address: "Chebba",
  mf: "XXXXXXXX",
  rc: "XXXXXXX",
  rib: "XXXXXXXX",
  tvaRate: 0.19,
  stampDuty: 0.0,
};

// ✅ Nombres comme l’ancien modèle : 10200.00 (pas de milliers)
function num2(value: any) {
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
  return n.toFixed(2);
}

// ⚙️ Préparation XLSX
const prepareData = (rows: CustomerType[]) => {
  const headersMap: Record<keyof CustomerType | string, string> = {
    nomPrenom: "Propriétaire",
    dateCreation: "Date création",
    nombreCaisses: "Nombre de caisses",
    quantiteOlive: "Quantité Olive (kg)",
    quantiteHuile: "Quantité Huile (kg)",
    quantiteOliveNet: "Quantité Olive Net (kg)",
    kattou3: "Kattou3 (%)",
    nisba: "Nisba (%)",
  };

  const keysToExport: (keyof CustomerType)[] = [
    "nomPrenom",
    "dateCreation",
    "nombreCaisses",
    "quantiteOlive",
    "quantiteOliveNet",
    "quantiteHuile",
    "kattou3",
    "nisba",
  ];

  const header = keysToExport.map((key) => headersMap[key]);

  const body = rows.map((row) => {
    return keysToExport.map((key) => {
      const value = row[key];
      if (value === undefined || value === null) return "";

      if (key === "dateCreation") {
        return new Date(value as string).toLocaleDateString("fr-FR");
      }

      if (typeof value === "number" && key !== "nombreCaisses") {
        return num2(value);
      }

      return String(value);
    });
  });

  return { header, body };
};

// ✅ Export XLSX
export const exportToXLSX = (
  rows: CustomerType[],
  filename = "export_proprietaire"
) => {
  const { header, body } = prepareData(rows);
  const dataToExport = [header, ...body];
  const ws = XLSX.utils.aoa_to_sheet(dataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Proprietaires");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// ✅ Export PDF (style moderne clean comme celui que tu as aimé)
export const exportToPDF = async (
  rows: CustomerType[],
  filename = "stock_proprietaire"
) => {
  if (typeof window === "undefined") return;

  try {
    const { default: jsPDF } = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");
    const autoTable = (autoTableModule as any).default || autoTableModule;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    const today = new Date().toLocaleDateString("fr-FR");

    // ====== ENTÊTE MODERNE (simple) ======
    doc.setFillColor(32, 52, 64);
    doc.rect(0, 0, pageW, 10, "F");

    let y = 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(20);
    doc.text(COMPANY_INFO.name, margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Adresse: ${COMPANY_INFO.address}`, margin, y + 5);
    doc.text(`MF: ${COMPANY_INFO.mf} | RC: ${COMPANY_INFO.rc}`, margin, y + 9);
    doc.text(`RIB: ${COMPANY_INFO.rib}`, margin, y + 13);

    // ✅ Titre changé (modifie ici comme tu veux)
    y += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20);
    doc.text("ÉTAT DU STOCK DES PROPRIÉTAIRES", pageW / 2, y, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);
    // doc.text(`Date d'exportation: ${today}`, pageW - margin, y + 6, { align: "right" });

    doc.setDrawColor(220);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 10, pageW - margin, y + 10);

    y += 16;

    // ====== TABLE ======
    const stockHeader = [
      "Propriétaire",
      "Date Création",
      "Caisses",
      "Olive Net (kg)",
      "Huile (kg)",
      "Kattou3 (%)",
      "Nisba (%)",
    ];

    const stockBody = rows.map((r) => [
      r.nomPrenom,
      new Date(r.dateCreation).toLocaleDateString("fr-FR"),
      String(r.nombreCaisses || 0),
      num2(r.quantiteOliveNet || 0),
      num2(r.quantiteHuile || 0),
      num2(r.kattou3 || 0) + "%",
      num2(r.nisba || 0) + "%",
    ]);

    // ✅ Calcul des totaux/moyennes (inchangé)
    const totalOliveNet = rows.reduce((sum, row) => sum + (row.quantiteOliveNet || 0), 0);
    const totalHuile = rows.reduce((sum, row) => sum + (row.quantiteHuile || 0), 0);
    const avgKattou3 =
      rows.length > 0 ? rows.reduce((sum, row) => sum + (row.kattou3 || 0), 0) / rows.length : 0;
    const avgNisba =
      rows.length > 0 ? rows.reduce((sum, row) => sum + (row.nisba || 0), 0) / rows.length : 0;

    // ✅ Table sans FOOT (car totaux vont dans dernière page)
    autoTable(doc, {
      head: [stockHeader],
      body: stockBody,
      startY: y,
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 8.6,
        cellPadding: 2.2,
        textColor: 30,
        lineColor: [230, 230, 230],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [20, 20, 20],
        fontStyle: "bold",
        lineWidth: 0,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 48 },
        1: { cellWidth: 26, halign: "center" },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 26, halign: "right" },
        4: { cellWidth: 22, halign: "right", fontStyle: "bold" },
        5: { cellWidth: 18, halign: "right" },
        6: { cellWidth: 18, halign: "right" },
      },
      margin: { left: margin, right: margin },
    });

    // ====== DERNIÈRE PAGE: TOTAUX / MOYENNES ======
    doc.addPage();

    // bande top
    doc.setFillColor(32, 52, 64);
    doc.rect(0, 0, pageW, 10, "F");

    let yy = 30;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20);
    doc.text("TOTAUX / MOYENNES", pageW / 2, yy, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);
    // doc.text(`Date d'exportation: ${today}`, pageW / 2, yy + 6, { align: "center" });

    // cadre
    const boxW = pageW - margin * 2;
    const boxX = margin;
    const boxY = yy + 16;
    const boxH = 55;

    doc.setDrawColor(200);
    doc.setLineWidth(0.4);
    doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "S");

    // lignes totaux
    const leftX = boxX + 10;
    const rightX = boxX + boxW - 10;
    let lineY = boxY + 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(20);

    doc.text("Total Olive Net :", leftX, lineY);
    doc.text(`${num2(totalOliveNet)} kg`, rightX, lineY, { align: "right" });

    lineY += 12;
    doc.text("Total Huile :", leftX, lineY);
    doc.text(`${num2(totalHuile)} kg`, rightX, lineY, { align: "right" });

    lineY += 12;
    doc.text("Moyenne Kattou3 :", leftX, lineY);
    doc.text(`${num2(avgKattou3)} %`, rightX, lineY, { align: "right" });

    lineY += 12;
    doc.text("Moyenne Nisba :", leftX, lineY);
    doc.text(`${num2(avgNisba)} %`, rightX, lineY, { align: "right" });

    // ====== FOOTER (page x/y) ======
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Page ${i} / ${pageCount}`, pageW / 2, pageH - 10, { align: "center" });
    }

    doc.save(`${filename}.pdf`);
  } catch (err) {
    console.error("Erreur export PDF :", err);
    alert(
      "Une erreur est survenue lors de la génération du PDF. Vérifiez si jspdf et jspdf-autotable sont installés."
    );
  }
};

