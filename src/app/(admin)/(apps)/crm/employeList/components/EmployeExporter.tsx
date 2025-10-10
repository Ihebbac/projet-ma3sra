// src/utils/EmployeExporter.ts
// Basé sur le code EmployeType et la logique d'importation dynamique pour PDF

import * as XLSX from 'xlsx';
import { Row } from '@tanstack/react-table';

// Types (Doit correspondre à EmployeCard.tsx)
interface Employe {
  _id: string
  nom: string
  prenom: string
  telephone: string
  poste: string
  salaireJournalier: number
  estActif: boolean
}
type EmployeTableType = Employe & {
    nomComplet: string;
}

/**
 * Prépare les données et les en-têtes pour l'exportation des employés.
 */
const prepareEmployeData = (rows: Row<EmployeTableType>[]) => {
    
    // Les clés de données que vous voulez inclure dans l'exportation
    const keysToExport: (keyof EmployeTableType)[] = [
        'nomComplet',
        'telephone',
        'poste',
        'salaireJournalier',
        'estActif',
    ];

    const headersMap: Record<keyof EmployeTableType | string, string> = {
      nomComplet: 'Nom Complet',
      telephone: 'Téléphone',
      poste: 'Poste',
      salaireJournalier: 'Salaire Journalier (DT)',
      estActif: 'Statut (Actif)',
    };

    const header = keysToExport.map(key => headersMap[key]);

    const body = rows.map(row => 
        keysToExport.map(key => {
            let value = row.original[key];
            
            if (value === undefined || value === null) return '';
            
            // Formatage spécifique
            if (key === 'salaireJournalier' && typeof value === 'number') {
                return value.toFixed(3);
            }
            if (key === 'estActif' && typeof value === 'boolean') {
                return value ? 'Actif' : 'Inactif';
            }

            return String(value);
        })
    );

    return { header, body };
};

// --- Exportation XLSX ---

export const exportToXLSX = (rows: Row<EmployeTableType>[], filename: string = 'export_employes') => {
    const { header, body } = prepareEmployeData(rows);

    const dataToExport = [header, ...body];
    const ws = XLSX.utils.aoa_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Données Employés");

    XLSX.writeFile(wb, `${filename}.xlsx`);
};

// --- Exportation PDF (avec importation dynamique pour jsPDF) ---

export const exportToPDF = async (rows: Row<EmployeTableType>[], filename: string = 'export_employes') => {
    if (typeof window === 'undefined') return;

    await (async () => {
        const jsPDFModule = await import('jspdf');
        await import('jspdf-autotable'); 

        const jsPDF = jsPDFModule.default;
        
        const { header, body } = prepareEmployeData(rows);
        
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); 

        doc.setFontSize(14);
        doc.text("Rapport des Employés", 14, 20);

        (doc as any).autoTable({
            head: [header],
            body: body,
            startY: 30, 
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
            headStyles: { fillColor: [32, 52, 64], textColor: 255, fontStyle: 'bold', halign: 'center' },
            margin: { top: 10 },
            
            didDrawPage: (data: any) => {
                doc.setFontSize(8);
                const pageCount = (doc as any).internal.getNumberOfPages();
                doc.text(`Page ${data.pageNumber} / ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10, { align: 'left' });
            },
        });

        doc.save(`${filename}.pdf`);
    })();
};