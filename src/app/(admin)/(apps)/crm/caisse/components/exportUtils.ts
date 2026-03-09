// utils/exportUtils.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface ExportData {
  [key: string]: string | number
}

interface Totals {
  [key: string]: string | number
}
// type Totals = Record<string, string | number>;

function cleanNumber(value: any) {
  if (typeof value === "number") return value;
  return (
    parseFloat(String(value).replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0
  );
}

/**
 * IMPORTANT:
 * fr-FR met souvent des espaces insécables (U+00A0 / U+202F) comme séparateur de milliers.
 * jsPDF ne les supporte pas bien -> il les affiche comme "/".
 * Donc on les remplace par " " (ou "." si tu préfères).
 */
function formatNumberFR(n: number, thousandsSep: " " | "." = " ") {
  const s = n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Remplace NBSP/NNBSP par séparateur safe
  return s.replace(/[\u00A0\u202F]/g, thousandsSep);
}

function formatDT(value: any, thousandsSep: " " | "." = " ") {
  const n = cleanNumber(value);
  const abs = formatNumberFR(Math.abs(n), thousandsSep);
  return n < 0 ? `- ${abs} DT` : `${abs} DT`;
}

function isMoneyColumn(name: string) {
  const c = name.toLowerCase();
  return (
    c.includes("montant") ||
    c.includes("total") ||
    c.includes("ttc") ||
    c.includes("ht") ||
    c.includes("tva") ||
    c.includes("net") ||
    c.includes("dt")
  );
}

function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 5,
  fill: [number, number, number] = [255, 255, 255],
  border: [number, number, number] = [226, 232, 240]
) {
  doc.setFillColor(...fill);
  doc.setDrawColor(...border);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, r, r, "FD");
}

export const exportToPDF = (
  data: ExportData[],
  title: string,
  subtitle: string,
  totals?: Totals
): void => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;
  const thousandsSep: " " | "." = " ";

  // --- Nettoyage (supprime nom utilisateur / username / emails du PDF) ---
  const sanitize = (s: any) => {
    const str = String(s ?? "");
    return str
      .replace(/\b(nom\s*utilisateur|nomutilisateur|utilisateur|username|user)\s*[:\-]\s*[^|•\n\r]+/gi, "")
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const subtitleClean = sanitize(subtitle);

  // -----------------------------
  // HEADER (PAGE 1 SEULEMENT)
  // -----------------------------
  const drawHeaderFirstPageOnly = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text(title, margin, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0);

    let bottomY = 18;

    if (subtitleClean) {
      const lines = doc.splitTextToSize(subtitleClean, contentW);
      doc.text(lines, margin, 20);
      bottomY = 20 + lines.length * 4.2 + 2;
    }

    // Ligne séparatrice (page 1 seulement)
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(margin, bottomY, pageW - margin, bottomY);

    return bottomY;
  };

  // Y où commence le tableau sur la page 1
  const headerBottomY = drawHeaderFirstPageOnly();
  const startYFirstPage = headerBottomY + 6;

  // -----------------------------
  // Empty state
  // -----------------------------
  if (!data.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("Aucune donnée à exporter.", margin, startYFirstPage);

    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.text(`Page 1 / ${pageCount}`, pageW / 2, pageH - 10, { align: "center" });

    doc.save(`${title}_${new Date().toISOString().split("T")[0]}.pdf`);
    return;
  }

  // -----------------------------
  // Table principale
  // -----------------------------
  const cols = Object.keys(data[0]);
  const body = data.map((row) =>
    cols.map((k) => {
      const v = row[k];
      return isMoneyColumn(k) ? formatDT(v, thousandsSep) : String(v ?? "");
    })
  );

  autoTable(doc, {
    // startY ne s'applique qu'à la 1ère page
    startY: startYFirstPage,

    // ✅ pour les pages suivantes: pas de header, juste un petit top margin
    margin: { left: margin, right: margin, top: 12, bottom: 18 },

    head: [cols],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      cellPadding: 2.0,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineWidth: 0.2,
    },
    didParseCell: (hook) => {
      const colName = cols[hook.column.index];
      if (isMoneyColumn(colName)) hook.cell.styles.halign = "right";
    },
  });

  let y = ((doc as any).lastAutoTable?.finalY ?? startYFirstPage) + 8;

  // -----------------------------
  // Totaux (simple, sans header même si nouvelle page)
  // -----------------------------
  if (totals && Object.keys(totals).length) {
    const entries = Object.entries(totals).map(([k, v]) => {
      const n = cleanNumber(v);
      const key = sanitize(k);
      const val = `${formatNumberFR(Math.abs(n), thousandsSep)} DT`;
      return [key, n < 0 ? `- ${val}` : val];
    });

    // nouvelle page si besoin
    if (y + 25 > pageH - 18) {
      doc.addPage();
      y = 12; // ✅ pas de header sur pages suivantes
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("Totaux", margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, top: 12, bottom: 18 },
      head: [["Libellé", "Montant"]],
      body: entries,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        cellPadding: 2.0,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: contentW * 0.65 },
        1: { halign: "right" },
      },
    });
  }

  // -----------------------------
  // Footer pages
  // -----------------------------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text(`Page ${i} / ${pageCount}`, pageW / 2, pageH - 10, { align: "center" });
  }

  doc.save(`${title}_${new Date().toISOString().split("T")[0]}.pdf`);
};

/**
 * Exporte des données en Excel (Styles mis à jour pour plus de neutralité)
 */
export const exportToExcel = (data: ExportData[], sheetName: string, fileName: string, totals?: ExportData[]): void => {
  const workbook = XLSX.utils.book_new()

  // Feuille principale des données
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Style pour l'en-tête (Gris foncé professionnel)
  if (worksheet['!ref']) {
    const range = XLSX.utils.decode_range(worksheet['!ref'])
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C })
      if (!worksheet[address]) continue
      // Couleurs neutres : Gris foncé (505050) et Blanc (FFFFFF)
      worksheet[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '505050' } }, 
        alignment: { horizontal: 'center' },
      }
    }
  }

  // Ajouter les totaux si fournis
  if (totals && totals.length > 0) {
    // --- Logique d'ajout des totaux simplifiée et corrigée pour l'origine ---
    
    // Ajouter une ligne vide avant les totaux
    XLSX.utils.sheet_add_aoa(worksheet, [[]], { origin: -1 })

    // Ajouter les totaux et déterminer l'origine de la ligne (pour le style)
    const totalRowStart = (worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']).e.r : 0) + 1;

    XLSX.utils.sheet_add_json(worksheet, totals, {
      origin: -1,
      skipHeader: true,
    })

    // Style pour les totaux (Gris clair professionnel)
    const totalRange = XLSX.utils.decode_range(worksheet['!ref']!)
    const startRow = totalRowStart 
    
    for (let R = startRow; R <= totalRange.e.r; ++R) {
        for (let C = totalRange.s.c; C <= totalRange.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: R, c: C })
            if (!worksheet[address]) continue
            // Couleurs neutres : Gris clair (D3D3D3) et Noir (000000)
            worksheet[address].s = {
                font: { bold: true, color: { rgb: '000000' } },
                fill: { fgColor: { rgb: 'D3D3D3' } }, 
                alignment: { horizontal: 'right' },
            }
        }
    }
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

/**
 * Exporte uniquement les lignes sélectionnées (utilise les fonctions corrigées)
 */
export const exportSelectedToPDF = (selectedData: ExportData[], title: string, totals?: Totals): void => {
  exportToPDF(selectedData, `${title}_Selection`, 'Données sélectionnées', totals)
}

export const exportSelectedToExcel = (selectedData: ExportData[], sheetName: string, fileName: string, totals?: ExportData[]): void => {
  exportToExcel(selectedData, sheetName, `${fileName}_Selection`, totals)
}