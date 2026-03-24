import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type ExportRow = Record<string, string | number | null | undefined>

const normalizeValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export const exportToPDF = (rows: ExportRow[], fileName = 'fitoura') => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Aucune donnée à exporter.')
  }

  const headers = Object.keys(rows[0] || {})
  if (headers.length === 0) {
    throw new Error('Colonnes introuvables pour le PDF.')
  }

  const body = rows.map((row) => headers.map((header) => normalizeValue(row[header])))

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const title = `Export ${fileName}`
  const dateText = `Date : ${new Date().toLocaleString('fr-FR')}`

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, 14, 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(dateText, 14, 22)

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [33, 37, 41],
      textColor: 255,
      fontStyle: 'bold',
    },
    bodyStyles: {
      textColor: 20,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: {
      top: 28,
      right: 10,
      bottom: 12,
      left: 10,
    },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages()
      const pageSize = doc.internal.pageSize
      const pageHeight = pageSize.height || pageSize.getHeight()

      doc.setFontSize(9)
      doc.text(
        `Page ${doc.getCurrentPageInfo().pageNumber} / ${pageCount}`,
        14,
        pageHeight - 5,
      )
    },
  })

  doc.save(`${fileName}.pdf`)
}