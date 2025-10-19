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
  name: 'Liste des clients',
  tvaRate: 0.19,      // TVA = 19%
  stampDuty: 0.6,     // Timbre fiscal
}

// ⚙️ Préparation des données
const prepareData = (rows: Row<CustomerType>[]) => {
  // Titres de colonnes
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

  // Colonnes à exporter
  const keysToExport: (keyof CustomerType)[] = [
    '_id', 'nomPrenom', 'numCIN', 'numTelephone',
    'nombreCaisses', 'quantiteOlive', 'quantiteOliveNet', 'quantiteHuile',
    'nisba', 'kattou3', 'prixKg', 'prixFinal', 'status'
  ]

  const header = keysToExport.map(key => headersMap[key])
  let totalHT = 0
  let totalOlive = 0
  let totalHuile = 0

  // Corps du tableau
  const body = rows.map(row => {
    const r = row.original
    const rowData = keysToExport.map(key => {
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

// ✅ Export XLSX
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


// ✅ Export PDF (avec placement corrigé)
export const exportToPDF = async (
  rows: Row<CustomerType>[],
  filename = 'Liste des clients'
) => {
  if (typeof window === 'undefined') return

  try {
    const { default: jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    // 🧮 Fonction utilitaire pour calculer les totaux
    const prepareData = (rows: Row<CustomerType>[]) => {
      let totalPrixFinal = 0
      let totalHuile = 0
      let totalOlive = 0

      rows.forEach(r => {
        totalPrixFinal += Number(r.original.prixFinal || 0)
        totalHuile += Number(r.original.quantiteHuile || 0)
        totalOlive += Number(r.original.quantiteOlive || 0)
      })

      return {
        totalPrixFinal,
        totalHuile,
        totalOlive,
      }
    }

    const { totalPrixFinal, totalHuile, totalOlive } = prepareData(rows)

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.width
    const margin = 14
    let y = 15

    // 🧾 EN-TÊTE
    doc.setFontSize(14).setFont(undefined, 'bold')
    doc.text('Liste des clients', margin, y)
    y += 8
    doc.setFontSize(10)
    doc.text(`Date d'export : ${new Date().toLocaleDateString()}`, margin, y)

    // 🧩 TABLEAU
    y += 10
    const tableHeaders = [
      'Nom & Prénom',
      'Téléphone',
      'Nb Caisses',
      'Qté Olive',
      'Qté Olive Net',
      'Qté Huile',
      'Nisba',
      'Kattou3',
      'Prix Kg',
      'Prix Final',
      'Statut',
    ]

    const tableBody = rows.map(r => [
      r.original.nomPrenom || '--',
      r.original.numTelephone || '--',
      (r.original.nombreCaisses || 0).toFixed(2),
      (r.original.quantiteOlive || 0).toFixed(2),
      (r.original.quantiteOliveNet || 0).toFixed(2),
      (r.original.quantiteHuile || 0).toFixed(2),
      (r.original.nisba || 0).toFixed(2),
      (r.original.kattou3 || 0).toFixed(2),
      (r.original.prixKg || 0).toFixed(2),
      (r.original.prixFinal || 0).toFixed(2),
      r.original.status || '—',
    ])

    autoTable(doc, {
      head: [tableHeaders],
      body: tableBody,
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      margin: { left: margin, right: margin },
    })

    // 📊 SECTION DES TOTAUX
    const finalY = (doc as any).lastAutoTable.finalY + 10
    const rightX = pageWidth - margin
    const labelX = rightX - 60

    doc.setFontSize(10).setFont(undefined, 'bold')
    doc.text('Totaux :', margin, finalY)

    doc.setFont(undefined, 'normal')
    doc.text(`Total Olive :`, labelX, finalY)
    doc.text(`${totalOlive.toFixed(2)} kg`, rightX, finalY, { align: 'right' })

    doc.text(`Total Huile :`, labelX, finalY + 6)
    doc.text(`${totalHuile.toFixed(2)} L`, rightX, finalY + 6, { align: 'right' })

    doc.text(`Total Prix Final :`, labelX, finalY + 12)
    doc.text(`${totalPrixFinal.toFixed(2)} DT`, rightX, finalY + 12, { align: 'right' })

    // 💾 SAUVEGARDE
    doc.save(`${filename}.pdf`)
  } catch (err) {
    console.error('Erreur export PDF :', err)
    alert('Une erreur est survenue lors de la génération du PDF.')
  }
}

