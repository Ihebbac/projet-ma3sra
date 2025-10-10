// src/utils/TableExporter.ts

import * as XLSX from 'xlsx';
import { Row } from '@tanstack/react-table';

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

// 🔧 Prépare les données à exporter
const prepareData = (rows: Row<FitouraType>[]) => {
  const headersMap: Record<keyof FitouraType | string, string> = {
    matriculeCamion: 'Matricule Camion',
    chauffeur: 'Chauffeur',
    poidsEntree: 'Poids Entrée (kg)',
    poidsSortie: 'Poids Sortie (kg)',
    poidsNet: 'Poids Net (kg)',
    prixUnitaire: 'Prix Unitaire (DT/kg)',
    montantTotal: 'Montant Total (DT)',
    status: 'Statut',
    dateSortie: 'Date Sortie',
  };

  const keysToExport: (keyof FitouraType)[] = [
    'matriculeCamion',
    'chauffeur',
    'poidsEntree',
    'poidsSortie',
    'poidsNet',
    'prixUnitaire',
    'montantTotal',
    'status',
    'dateSortie',
  ];

  const header = keysToExport.map((key) => headersMap[key]);

  const body = rows.map((row) =>
    keysToExport.map((key) => {
      const value = row.original[key];
      if (value === undefined || value === null) return '';
      if (
        ['poidsEntree', 'poidsSortie', 'poidsNet', 'prixUnitaire', 'montantTotal'].includes(key as string) &&
        typeof value === 'number'
      ) {
        return value.toFixed(2);
      }
      return String(value);
    })
  );

  return { header, body };
};

// ✅ Exportation XLSX
export const exportToXLSX = (rows: Row<FitouraType>[], filename = 'export_fitoura') => {
  const { header, body } = prepareData(rows);
  const dataToExport = [header, ...body];
  const ws = XLSX.utils.aoa_to_sheet(dataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Données Fitoura');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// ✅ Exportation PDF corrigée
export const exportToPDF = async (rows: Row<FitouraType>[], filename = 'export_fitoura') => {
  if (typeof window === 'undefined') return; // 🔒 sécurité SSR

  try {
    // Import dynamique propre à Next.js
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default || (await import('jspdf-autotable'));

    const { header, body } = prepareData(rows);

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFontSize(14);
    doc.text('Rapport de Fitoura - Données Filtrées', 14, 20);

    // ⚡ Important : appeler directement autoTable en lui passant `doc`
    autoTable(doc, {
      head: [header],
      body,
      startY: 30,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: {
        fillColor: [32, 52, 64],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      margin: { top: 10 },
      didDrawPage: (data: any) => {
        doc.setFontSize(8);
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.text(
          `Page ${data.pageNumber} / ${pageCount}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10,
          { align: 'left' }
        );
      },
    });

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Erreur export PDF :', error);
    alert("Une erreur est survenue lors de la génération du PDF.");
  }
};
