// ✅ src/utils/TableExporter.ts
import * as XLSX from 'xlsx'
import { Row } from '@tanstack/react-table'

// 🧾 Type client
type CustomerType = {
  _id: string
  nomPrenom: string
  numCIN: number
  numTelephone: number
  type: string
  dateCreation: string
  nombreCaisses?: number
  quantiteOlive?: number
  quantiteHuile?: number
  kattou3?: number
  nisba?: number
  quantiteOliveNet?: number
  nisbaReelle?: number
  quantiteHuileTheorique?: number
  differenceHuile?: number
  nombreWiba?: number
  nombreQfza?: number
  huileParQfza?: number
  prixFinal?: number
  prixKg?: number
  status: 'payé' | 'non payé'
}

// 📍 Informations société
const COMPANY_INFO = {
  tvaRate: 0.19,
  stampDuty: 0.6,
}

// ⚙️ Préparation des données pour Excel
const prepareData = (rows: Row<CustomerType>[]) => {
  const headersMap: Record<keyof CustomerType, string> = {
    _id: 'ID',
    nomPrenom: 'Nom & Prénom',
    numCIN: 'CIN',
    numTelephone: 'Téléphone',
    type: 'Type',
    dateCreation: 'Date de création',
    nombreCaisses: 'Nb Caisses',
    quantiteOlive: 'Qté Olive (kg)',
    quantiteHuile: 'Qté Huile (L)',
    kattou3: 'Kattou3',
    nisba: 'Nisba (%)',
    quantiteOliveNet: 'Qté Olive Net (kg)',
    nisbaReelle: 'Nisba Réelle (%)',
    quantiteHuileTheorique: 'Huile Théorique (L)',
    differenceHuile: 'Différence Huile (L)',
    nombreWiba: 'Nb Wiba',
    nombreQfza: 'Nb Qfza',
    huileParQfza: 'Huile/Qfza',
    prixFinal: 'Prix Final (DT)',
    prixKg: 'Prix/Kg (DT)',
    status: 'Statut',
  }

  const keysToExport: (keyof CustomerType)[] = [
    '_id',
    'nomPrenom',
    'numCIN',
    'numTelephone',
    'nombreCaisses',
    'quantiteOlive',
    'quantiteOliveNet',
    'quantiteHuile',
    'nisba',
    'kattou3',
    'prixKg',
    'prixFinal',
    'status',
    'dateCreation',
  ]

  const header = keysToExport.map((key) => headersMap[key])
  let totalHT = 0
  let totalOlive = 0
  let totalHuile = 0

  const body = rows.map((row) => {
    const r = row.original
    const rowData = keysToExport.map((key) => {
      const value = r[key]
      if (value === undefined || value === null) return ''
      if (['quantiteOlive', 'quantiteOliveNet', 'quantiteHuile', 'prixKg', 'prixFinal'].includes(key) && typeof value === 'number')
        return value.toFixed(3)
      return String(value)
    })
    totalHT += Number(r.prixFinal || 0)
    totalOlive += Number(r.quantiteOlive || 0)
    totalHuile += Number(r.quantiteHuile || 0)
    return rowData
  })

  const totalTVA = totalHT * COMPANY_INFO.tvaRate
  const totalTTC = totalHT + totalTVA + COMPANY_INFO.stampDuty

  return { header, body, totalHT, totalTVA, totalTTC, totalOlive, totalHuile }
}

// ✅ Export Excel
export const exportToXLSX = (rows: Row<CustomerType>[], filename = 'export_clients') => {
  const { header, body, totalHT, totalTVA, totalTTC, totalOlive, totalHuile } = prepareData(rows)
  const dataToExport = [
    header,
    ...body,
    [],
    ['Totaux'],
    ['Total Olive (kg)', totalOlive.toFixed(3)],
    ['Total Huile (L)', totalHuile.toFixed(3)],
    ['Total HT (DT)', totalHT.toFixed(3)],
    ['TVA (19%)', totalTVA.toFixed(3)],
    ['Timbre Fiscal', COMPANY_INFO.stampDuty.toFixed(3)],
    ['Total TTC (DT)', totalTTC.toFixed(3)],
  ]

  const ws = XLSX.utils.aoa_to_sheet(dataToExport)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'clients')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// 🧮 Totaux PDF
const preparePdfData = (rows: Row<CustomerType>[]) => {
  let totalPrixFinal = 0
  let totalHuile = 0
  let totalOlive = 0
  let totalPaye = 0
  let totalNonPaye = 0

  rows.forEach((r) => {
    const prix = Number(r.original.prixFinal || 0)
    totalPrixFinal += prix
    totalHuile += Number(r.original.quantiteHuile || 0)
    totalOlive += Number(r.original.quantiteOlive || 0)
    if (r.original.status === 'payé') totalPaye += prix
    else totalNonPaye += prix
  })

  return { totalPrixFinal, totalHuile, totalOlive, totalPaye, totalNonPaye }
}

// ✅ Export PDF (Noir & Blanc)
export const exportToPDF = async (rows: Row<CustomerType>[], filename = 'Rapport_Clients') => {
  if (typeof window === 'undefined') return
  try {
    const { default: jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const totals = preparePdfData(rows)
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.width
    const margin = 10
    let y = 20

    doc.setFontSize(14).setTextColor(0)
    doc.text('Rapport des Clients', pageWidth / 2, y, { align: 'center' })

    y += 10
    doc.setFontSize(10)
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')} | Nombre de clients : ${rows.length}`, margin, y)

    // === Tableau principal ===
    y += 8
    const headers = ['Nom & Prénom', 'Téléphone','date', 'Qté Olive Net (kg)', 'Qté Huile (L)', 'Prix Final (DT)', 'Statut']
    const body = rows.map((r) => [
      r.original.nomPrenom || '—',
      r.original.numTelephone || '—',
      r.original.dateCreation ? new Date(r.original.dateCreation).toLocaleDateString() : '—',      (r.original.quantiteOliveNet || 0).toFixed(2),
      (r.original.quantiteHuile || 0).toFixed(2),
      (r.original.prixFinal || 0).toFixed(2),
      r.original.status || '—',
    ])

    autoTable(doc, {
      head: [headers],
      body,
      startY: y,
      theme: 'grid',
      styles: { fontSize: 9, textColor: 0, lineColor: 0 },
      headStyles: { fillColor: [230, 230, 230], textColor: 0 },
      margin: { left: margin, right: margin },
    })

    // === Totaux ===
    const finalY = (doc as any).lastAutoTable.finalY + 10
    const labelX = pageWidth - 70
    const valueX = pageWidth - margin

    doc.setFontSize(11).setFont('bold')
    doc.text('RÉSUMÉ DES TOTAUX', labelX, finalY)

    doc.setFontSize(10).setFont('normal')
    let currentY = finalY + 6

    const addRow = (label: string, value: string) => {
      doc.text(label, labelX, currentY, { align: 'right' })
      doc.text(value, valueX, currentY, { align: 'right' })
      currentY += 6
    }

    addRow('Total Olive (kg) :', `${totals.totalOlive.toFixed(2)} kg`)
    addRow('Total Huile (L) :', `${totals.totalHuile.toFixed(2)} L`)
    // addRow('Total Payé :', `${totals.totalPaye.toFixed(2)} DT`)
    // addRow('Total Non Payé :', `${totals.totalNonPaye.toFixed(2)} DT`)
    // addRow('TOTAL GÉNÉRAL :', `${totals.totalPrixFinal.toFixed(2)} DT`)

    // === Pied de page ===
    const pageHeight = doc.internal.pageSize.height
    doc.setDrawColor(150)
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)
    doc.setFontSize(8)
    doc.text('Document généré automatiquement - Olive Plus © 2025', pageWidth / 2, pageHeight - 10, { align: 'center' })

    // 💾 Sauvegarde
    doc.save(`${filename}.pdf`)
  } catch (err) {
    console.error('Erreur export PDF :', err)
    alert('Une erreur est survenue lors de la génération du PDF.')
  }
}
