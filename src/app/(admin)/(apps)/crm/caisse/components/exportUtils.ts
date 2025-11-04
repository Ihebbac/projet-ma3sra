// utils/exportUtils.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Types pour les données d'export
interface ExportData {
  [key: string]: any
}

interface Totals {
  [key: string]: string | number
}

/**
 * Exporte des données en PDF
 */
export const exportToPDF = (data: ExportData[], title: string, subtitle: string, totals?: Totals): void => {
  const doc = new jsPDF()

  // En-tête
  doc.setFontSize(16)
  doc.setTextColor(40)
  doc.text(title, 14, 15)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(subtitle, 14, 22)

  // Tableau principal
  autoTable(doc, {
    head: [Object.keys(data[0] || {})],
    body: data.map((row) => Object.values(row)),
    startY: 30,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
  })

  // Totaux si fournis
  if (totals && Object.keys(totals).length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY + 10

    doc.setFontSize(10)
    doc.setTextColor(40)
    // doc.setFont(undefined, 'bold')
    doc.text('TOTAUX', 14, finalY)

    autoTable(doc, {
      head: [Object.keys(totals)],
      body: [Object.values(totals)],
      startY: finalY + 5,
      theme: 'grid',
      headStyles: {
        fillColor: [46, 204, 113],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        fontStyle: 'bold',
      },
    })
  }

  // Pied de page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Page ${i} / ${pageCount} - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' },
    )
  }

  doc.save(`${title}_${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Exporte des données en Excel
 */
export const exportToExcel = (data: ExportData[], sheetName: string, fileName: string, totals?: ExportData[]): void => {
  const workbook = XLSX.utils.book_new()

  // Feuille principale des données
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Style pour l'en-tête
  if (worksheet['!ref']) {
    const range = XLSX.utils.decode_range(worksheet['!ref'])
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C })
      if (!worksheet[address]) continue
      worksheet[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2980B9' } },
        alignment: { horizontal: 'center' },
      }
    }
  }

  // Ajouter les totaux si fournis
  if (totals && totals.length > 0) {
    const totalRange = XLSX.utils.json_to_sheet(totals, { skipHeader: true })
    const dataRange = XLSX.utils.decode_range(worksheet['!ref']!)
    const totalDataRange = XLSX.utils.decode_range(totalRange['!ref']!)

    // Étendre la plage de la feuille principale pour inclure les totaux
    dataRange.e.r += totalDataRange.e.r + 2 // +2 pour l'espacement

    // Ajouter une ligne vide avant les totaux
    XLSX.utils.sheet_add_aoa(worksheet, [[]], { origin: -1 })

    // Ajouter les totaux
    XLSX.utils.sheet_add_json(worksheet, totals, {
      origin: -1,
      skipHeader: true,
    })

    // Style pour les totaux
    const startRow = dataRange.e.r - totalDataRange.e.r
    for (let C = dataRange.s.c; C <= dataRange.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: startRow, c: C })
      if (!worksheet[address]) continue
      worksheet[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '27AE60' } },
        alignment: { horizontal: 'center' },
      }
    }

    worksheet['!ref'] = XLSX.utils.encode_range(dataRange)
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

/**
 * Exporte uniquement les lignes sélectionnées
 */
export const exportSelectedToPDF = (selectedData: ExportData[], title: string, totals?: Totals): void => {
  exportToPDF(selectedData, `${title}_Selection`, 'Données sélectionnées', totals)
}

export const exportSelectedToExcel = (selectedData: ExportData[], sheetName: string, fileName: string, totals?: ExportData[]): void => {
  exportToExcel(selectedData, sheetName, `${fileName}_Selection`, totals)
}
