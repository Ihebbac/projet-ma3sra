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

export const exportToPDF = (
  data: ExportData[],
  title: string,
  subtitle: string,
  totals?: Totals
): void => {
  const doc = new jsPDF()
  const margin = 14
  const pageWidth = doc.internal.pageSize.width
  const lineHeight = 6

  // --- 1. En-tête ---
  doc.setFontSize(16)
  doc.setTextColor(0)
  doc.text(title, margin, 15)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(subtitle, margin, 22)

  // --- 2. Tableau principal ---
  if (data.length > 0) {
    autoTable(doc, {
      head: [Object.keys(data[0])],
      body: data.map(row => Object.values(row)),
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, textColor: 0 },
      columnStyles: { 1: { halign: 'right' } }
    })
  }

  const colSpacing = {
    0: 14, // marge gauche
    2: doc.internal.pageSize.width - 14 // marge droite
  }

  // --- 3. Totaux corrigés ---
  let y = (doc as any).lastAutoTable?.finalY || 30
  if (totals && Object.keys(totals).length > 0) {
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('TOTAUX', colSpacing[0], y)
  
    y += 3
    doc.setLineWidth(0.3)
    doc.line(colSpacing[0], y, colSpacing[2], y)
    y += 4
  
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
  
    Object.entries(totals).forEach(([key, value], index, arr) => {
      y += lineHeight
  
      // Nettoyage de la valeur
      let numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0
  
      // Formatage français
      let formatted = Math.abs(numericValue).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  
      // Ajouter signe + ou - pour Total Net
      if (key.toLowerCase().includes('net') && numericValue > 0) formatted = `+ ${formatted}`
      else if (numericValue < 0) formatted = `- ${formatted}`
  
      doc.setFont('helvetica', index === arr.length - 1 ? 'bold' : 'normal')
  
      // **ALIGNEMENT CORRECT** : clé à gauche, valeur à droite
      doc.text(key, colSpacing[0], y)
      doc.text(formatted + ' DT', colSpacing[2], y, { align: 'right' })
  
      // Ligne sous Total Net
      if (index === arr.length - 1) {
        y += 4
        doc.setLineWidth(0.5)
        doc.line(colSpacing[0], y, colSpacing[2], y)
      }
    })
  }


  // --- 4. Pied de page ---
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text(
      `Page ${i} / ${pageCount} - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  // --- 5. Sauvegarde ---
  doc.save(`${title}_${new Date().toISOString().split('T')[0]}.pdf`)
}

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