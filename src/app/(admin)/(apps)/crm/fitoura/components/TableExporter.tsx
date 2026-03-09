// ✅ src/utils/TableExporter.ts

import * as XLSX from "xlsx";
import { Row } from "@tanstack/react-table";

// 🧾 Définition du type Fitoura
type FitouraType = {
  _id: string;
  matriculeCamion: string;
  chauffeur: string;
  poidsEntree: number;
  poidsSortie?: number;
  poidsNet?: number;
  prixUnitaire: number;
  montantTotal?: number;
  status: string;
  dateSortie?: string;
};

// 📍 Informations société
const COMPANY_INFO = {
  name: "Transport Fitoura",
  address: "Chebba",
  mf: "XXXXXXXX",
  rc: "XXXXXXX",
  rib: "XXXXXXXX",
  tvaRate: 0.19,
  stampDuty: 0.0,
};

// ✅ Nombres comme l’ancien modèle: 10200.000 (pas de milliers, point décimal)
function num3(value: any) {
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
  return n.toFixed(0);
}

function ensureSpace(doc: any, y: number, needed: number, topAfterNewPage = 18) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 16) {
    doc.addPage();
    return topAfterNewPage;
  }
  return y;
}

// ⚙️ Préparation des données (LOGIQUE INCHANGÉE)
const prepareData = (rows: Row<FitouraType>[]) => {
  const headersMap: Record<keyof FitouraType | string, string> = {
    matriculeCamion: "Matricule Camion",
    chauffeur: "Chauffeur",
    poidsEntree: "Poids Entrée (kg)",
    poidsSortie: "Poids Sortie (kg)",
    poidsNet: "Poids Net (kg)",
    prixUnitaire: "Prix Unitaire (DT/kg)",
    montantTotal: "Montant Total HT (DT)",
    // status: "Statut",
    dateSortie: "Date Sortie",
  };

  const keysToExport: (keyof FitouraType)[] = [
    "matriculeCamion",
    "chauffeur",
    "poidsEntree",
    "poidsSortie",
    "poidsNet",
    "prixUnitaire",
    "montantTotal",
    // "status",
    "dateSortie",
  ];

  const header = keysToExport.map((key) => headersMap[key]);

  let totalHT = 0;
  let totalPoidsNet = 0;
  let totalPoidsSortie = 0;
  let totalPoidsEntree = 0;

  const body = rows.map((row) => {
    const rowData = keysToExport.map((key) => {
      const value = row.original[key];
      if (value === undefined || value === null) return "";

      if (key === "montantTotal" && typeof value === "number") totalHT += value;
      if (key === "poidsNet" && typeof value === "number") totalPoidsNet += value;
      if (key === "poidsSortie" && typeof value === "number") totalPoidsSortie += value;
      if (key === "poidsEntree" && typeof value === "number") totalPoidsEntree += value;

      if (
        ["poidsEntree", "poidsSortie", "poidsNet", "prixUnitaire", "montantTotal"].includes(
          key as string
        ) &&
        typeof value === "number"
      ) {
        return value.toFixed(1);
      }

      return String(value);
    });

    return rowData;
  });

  // ⚠️ on garde ta logique (pas de changement)
  const totalTVA = totalHT;
  const totalTTC = totalHT + COMPANY_INFO.stampDuty;

  return { header, body, totalHT, totalPoidsNet, totalTTC, totalPoidsEntree, totalPoidsSortie };
};

// ✅ Export XLSX (restauré)
export const exportToXLSX = (rows: Row<FitouraType>[], filename = "export_fitoura") => {
  const { header, body } = prepareData(rows);
  const dataToExport = [header, ...body];
  const ws = XLSX.utils.aoa_to_sheet(dataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fitoura");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// ✅ Export PDF (entête moderne clean + header tableau moderne + details)
export const exportToPDF = async (
  rows: Row<FitouraType>[],
  filename = "facture_fitoura",
  clientName = "Huillerie bouchema",
  clientMF = "***",
  clientAddress = "Chebba",
  invoiceNumber = "2025-0012"
) => {
  if (typeof window === "undefined") return;

  try {
    const { default: jsPDF } = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");
    const autoTable = (autoTableModule as any).default || autoTableModule;

    const { totalPoidsNet, totalPoidsEntree, totalPoidsSortie } = prepareData(rows);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    const today = new Date().toLocaleDateString("fr-FR");

    // ===================== ENTÊTE MODERNE CLEAN (sans username) =====================
    // Bande fine en haut + titre + bloc facture à droite (moderne mais simple)
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

    // Bloc facture à droite (encadré moderne)
    const boxW = 70;
    const boxH = 22;
    const boxX = pageW - margin - boxW;
    const boxY = 14;

    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(20);
    doc.text("FACTURE", boxX + boxW - 4, boxY + 7, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`N°: ${invoiceNumber}`, boxX + boxW - 4, boxY + 13, { align: "right" });
    doc.text(`Date: ${today}`, boxX + boxW - 4, boxY + 18, { align: "right" });

    // Client bloc (détails)
    y += 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20);
    doc.text("FACTURÉ À :", margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(clientName, margin, y + 5);

    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Adresse: ${clientAddress}`, margin, y + 10);
    doc.text(`MF: ${clientMF}`, margin, y + 15);

    // ligne séparation
    doc.setDrawColor(220);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 20, pageW - margin, y + 20);

    y += 26;

    // ===================== TABLE HEADER + BODY (plus moderne + détails) =====================
    const serviceHeader = [
      "Service / Camion / Chauffeur",
      "Brut (Kg)",
      "Tare (Kg)",
      "Net (Kg)",
      "Date",
      // "Statut",
    ];

    // ✅ mapping inchangé
    const tableBody = rows.map((r) => {
      const o = r.original;
      return [
        `Transport Fitoura | Camion: ${o.matriculeCamion ?? ""} | Chauffeur: ${o.chauffeur ?? ""}`,
        num3(o.poidsSortie || 0), // Brut
        num3(o.poidsNet || 0),    // Tare
        num3(o.poidsEntree || 0), // Net
        o.dateSortie?.toString().split("T")[0] || "",
        // o.status || "",
      ];
    });

    autoTable(doc, {
      head: [serviceHeader],
      body: tableBody,
      startY: y,
      theme: "plain", // moderne
      styles: {
        fontSize: 8.6,
        cellPadding: 2.2,
        textColor: 30,
        lineColor: [230, 230, 230],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [241, 245, 249], // header soft
        textColor: [20, 20, 20],
        fontStyle: "bold",
        lineWidth: 0,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right", fontStyle: "bold" },
        4: { halign: "center" },
        5: { halign: "center" },
      },
      margin: { left: margin, right: margin },
    });

    // ===================== TOTAUX (même format ancien) =====================
    let finalY = (doc as any).lastAutoTable.finalY + 12;
    finalY = ensureSpace(doc, finalY, 30, 18);

    const rightX = pageW - margin;
    const labelX = rightX - 65;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20);

    doc.text("Poids Brut Total :", labelX, finalY);
    doc.text(`${num3(totalPoidsSortie)} KG`, rightX, finalY, { align: "right" });

    doc.text("Poids Net Total :", labelX, finalY + 8);
    doc.text(`${num3(totalPoidsEntree)} KG`, rightX, finalY + 8, { align: "right" });

    doc.text("Tare Total :", labelX, finalY + 16);
    doc.text(`${num3(totalPoidsNet)} KG`, rightX, finalY + 16, { align: "right" });

    doc.setDrawColor(200);
    doc.setLineWidth(0.4);
    doc.line(labelX, finalY + 20, rightX, finalY + 20);

    // ===================== FOOTER (sans username) =====================
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
    alert("Une erreur est survenue lors de la génération du PDF.");
  }
};
