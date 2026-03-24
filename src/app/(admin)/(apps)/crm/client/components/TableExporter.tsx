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

      if (
        ['quantiteOlive', 'quantiteOliveNet', 'quantiteHuile', 'prixKg', 'prixFinal'].includes(String(key)) &&
        typeof value === 'number'
      ) {
        return value.toFixed(3)
      }

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
    totalOlive += Number(r.original.quantiteOliveNet || 0)
    if (r.original.status === 'payé') totalPaye += prix
    else totalNonPaye += prix
  })

  return { totalPrixFinal, totalHuile, totalOlive, totalPaye, totalNonPaye }
}

// Fonction pour détecter si le texte contient de l'arabe
const containsArabic = (text: string): boolean => {
  if (!text) return false
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  return arabicPattern.test(text)
}

// Variable pour stocker la police arabe chargée
let arabicFontLoaded = false

// Fonction pour charger la police arabe
const loadArabicFont = async (doc: any) => {
  if (arabicFontLoaded) return true

  try {
    const response = await fetch('https://cdn.jsdelivr.net/gh/aliftype/amiri@master/fonts/Amiri-Regular.ttf')
    if (!response.ok) {
      throw new Error('Police non trouvée')
    }

    const arrayBuffer = await response.arrayBuffer()
    const binaryString = Array.from(new Uint8Array(arrayBuffer))
      .map((byte) => String.fromCharCode(byte))
      .join('')
    const base64String = btoa(binaryString)

    doc.addFileToVFS('Amiri-Regular.ttf', base64String)
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal')
    arabicFontLoaded = true
    return true
  } catch (error) {
    console.error('Erreur chargement police arabe:', error)
    return false
  }
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR')
}

const formatNumber = (value?: number, digits = 2) => Number(value || 0).toFixed(digits)

// ✅ Export PDF avec support arabe/français mixte
export const exportToPDF = async (rows: Row<CustomerType>[], filename = 'Rapport_Clients') => {
  console.log('rows', rows)
  if (typeof window === 'undefined') return

  try {
    const { default: jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const totals = preparePdfData(rows)
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    // Charger la police arabe
    await loadArabicFont(doc)

    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 10
    let y = 20

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(14)
    doc.setTextColor(0)
    doc.text('Rapport des Clients', pageWidth / 2, y, { align: 'center' })

    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(
      `Date : ${new Date().toLocaleDateString('fr-FR')} | Nombre de clients : ${rows.length}`,
      margin,
      y
    )

    // === Tableau principal ===
    y += 8
    const headers = ['Nom & Prénom', 'Téléphone', 'Date', 'Qté Olive Net (kg)', 'Qté Huile (L)', 'Prix Final (DT)', 'Statut']

    const body = rows.map((r) => {
      const nomPrenom = r.original.nomPrenom || '—'
      const status = r.original.status || '—'

      const nomIsArabic = containsArabic(nomPrenom)
      const statusIsArabic = containsArabic(status)

      return [
        {
          content: nomPrenom,
          styles: {
            font: arabicFontLoaded ? 'Amiri' : 'helvetica',
            fontStyle: 'normal',
            halign: nomIsArabic ? 'right' : 'left',
            valign: 'middle',
          },
        },
        {
          content: r.original.numTelephone?.toString() || '—',
          styles: {
            font: 'helvetica',
            fontStyle: 'normal',
            halign: 'center',
            valign: 'middle',
          },
        },
        {
          content: formatDate(r.original.dateCreation),
          styles: {
            font: 'helvetica',
            fontStyle: 'normal',
            halign: 'center',
            valign: 'middle',
          },
        },
        {
          content: formatNumber(r.original.quantiteOliveNet, 2),
          styles: {
            font: 'helvetica',
            fontStyle: 'normal',
            halign: 'right',
            valign: 'middle',
          },
        },
        {
          content: formatNumber(r.original.quantiteHuile, 2),
          styles: {
            font: 'helvetica',
            fontStyle: 'normal',
            halign: 'right',
            valign: 'middle',
          },
        },
        {
          content: formatNumber(r.original.prixFinal, 2),
          styles: {
            font: 'helvetica',
            fontStyle: 'normal',
            halign: 'right',
            valign: 'middle',
          },
        },
        {
          content: status,
          styles: {
            font: arabicFontLoaded ? 'Amiri' : 'helvetica',
            fontStyle: 'normal',
            halign: statusIsArabic ? 'right' : 'center',
            valign: 'middle',
          },
        },
      ]
    })

    autoTable(doc, {
      head: [headers],
      body,
      startY: y,
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: {
        font: 'helvetica',
        fontStyle: 'normal',
        fontSize: 9,
        textColor: 0,
        lineColor: 0,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: 0,
        fontStyle: 'bold',
        font: 'helvetica',
        halign: 'center',
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 24 },
        2: { cellWidth: 24 },
        3: { cellWidth: 26 },
        4: { cellWidth: 22 },
        5: { cellWidth: 24 },
        6: { cellWidth: 22 },
      },
    })

    // === Totaux ===
    const finalY = ((doc as any).lastAutoTable?.finalY || y + 100) + 10
    const labelX = pageWidth - 70
    const valueX = pageWidth - margin

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('RÉSUMÉ DES TOTAUX', labelX, finalY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    let currentY = finalY + 6

    const addRow = (label: string, value: string) => {
      doc.text(label, labelX, currentY, { align: 'right' })
      doc.text(value, valueX, currentY, { align: 'right' })
      currentY += 6
    }

    addRow('Total Olive (kg) :', `${totals.totalOlive.toFixed(2)} kg`)
    addRow('Total Huile (L) :', `${totals.totalHuile.toFixed(2)} L`)
    addRow('Montant total :', `${totals.totalPrixFinal.toFixed(2)} TND`)

    // === Pied de page ===
    doc.setDrawColor(150)
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('Document généré automatiquement - Olive Plus © 2025', pageWidth / 2, pageHeight - 10, {
      align: 'center',
    })

    // 💾 Sauvegarde
    doc.save(`${filename}.pdf`)
  } catch (err) {
    console.error('Erreur export PDF :', err)
    alert('Une erreur est survenue lors de la génération du PDF.')
  }
}