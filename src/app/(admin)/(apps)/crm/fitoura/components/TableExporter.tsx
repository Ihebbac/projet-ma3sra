// ✅ src/utils/TableExporter.ts

import * as XLSX from 'xlsx'
import { Row } from '@tanstack/react-table'

// 🧾 Définition du type Fitoura
type FitouraType = {
  _id: string
  matriculeCamion: string
  chauffeur: string
  poidsEntree: number
  poidsSortie?: number
  poidsNet?: number
  prixUnitaire: number
  montantTotal?: number
  status: string
  dateSortie?: string
}

// 📍 Informations société
const COMPANY_INFO = {
  name: 'SOCIÉTÉ DE TRANSPORT FITOURA S.A.R.L.',
  address: "Rue de l'Export, 1001 Tunis",
  mf: '1234567X/A/M/000',
  rc: 'B12345672025',
  rib: '12 345 678 9012 3456 7890 12',
  tvaRate: 0.19,
  stampDuty: 1.0,
}

// ⚙️ Préparation des données
const prepareData = (rows: Row<FitouraType>[]) => {
  const headersMap: Record<keyof FitouraType | string, string> = {
    matriculeCamion: 'Matricule Camion',
    chauffeur: 'Chauffeur',
    poidsEntree: 'Poids Entrée (kg)',
    poidsSortie: 'Poids Sortie (kg)',
    poidsNet: 'Poids Net (kg)',
    prixUnitaire: 'Prix Unitaire (DT/kg)',
    montantTotal: 'Montant Total HT (DT)',
    status: 'Statut',
    dateSortie: 'Date Sortie',
  }

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
  ]

  const header = keysToExport.map((key) => headersMap[key])
  let totalHT = 0

  const body = rows.map((row) => {
    const rowData = keysToExport.map((key) => {
      const value = row.original[key]
      if (value === undefined || value === null) return ''
      if (key === 'montantTotal' && typeof value === 'number') totalHT += value
      if (['poidsEntree', 'poidsSortie', 'poidsNet', 'prixUnitaire', 'montantTotal'].includes(key as string) && typeof value === 'number')
        return value.toFixed(3)
      return String(value)
    })
    return rowData
  })

  const totalTVA = totalHT * COMPANY_INFO.tvaRate
  const totalTTC = totalHT + totalTVA + COMPANY_INFO.stampDuty

  return { header, body, totalHT, totalTVA, totalTTC }
}

// ✅ Export XLSX
export const exportToXLSX = (rows: Row<FitouraType>[], filename = 'export_fitoura') => {
  const { header, body } = prepareData(rows)
  const dataToExport = [header, ...body]
  const ws = XLSX.utils.aoa_to_sheet(dataToExport)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Fitoura')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ✅ Export PDF (avec placement corrigé)
export const exportToPDF = async (
  rows: Row<FitouraType>[],
  filename = 'facture_fitoura',
  clientName = 'CLIENT PROFESSIONNEL S.A.R.L.',
  clientMF = '7654321B/M/A/000',
  clientAddress = '12 Rue de la Logistique, 8050 Hammam Sousse',
  invoiceNumber = '2025-0012',
) => {
  if (typeof window === 'undefined') return

  try {
    const { default: jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default || (await import('jspdf-autotable'))

    const { body, totalHT, totalTVA, totalTTC } = prepareData(rows)

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.width
    const margin = 14

    // 🧾 EN-TÊTE
    let y = 15
    doc.setFontSize(14).setFont('bold')
    doc.text(COMPANY_INFO.name, margin, y)
    doc.setFontSize(9).setFont('normal')
    doc.text(`Adresse: ${COMPANY_INFO.address}`, margin, y + 5)
    doc.text(`MF: ${COMPANY_INFO.mf} | RC: ${COMPANY_INFO.rc}`, margin, y + 9)
    doc.text(`RIB: ${COMPANY_INFO.rib}`, margin, y + 13)

    // Bloc "FACTURE" à droite
    doc.setFontSize(18).setFont('bold')
    doc.text('FACTURE', pageWidth - margin, 20, { align: 'right' })
    doc.setFontSize(10).setFont('normal')
    doc.text(`N° Facture: ${invoiceNumber}`, pageWidth - margin, 26, { align: 'right' })
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - margin, 30, { align: 'right' })

    // Infos client
    y += 25
    doc.setFontSize(10).setFont('bold')
    doc.text('FACTURÉ À :', margin, y)
    doc.setFontSize(10).setFont('normal')
    doc.text(clientName, margin, y + 5)
    doc.setFontSize(8)
    doc.text(`Adresse: ${clientAddress}`, margin, y + 9)
    doc.text(`MF: ${clientMF}`, margin, y + 13)
    y += 25

    // 🧩 TABLEAU DES LIGNES
    const serviceHeader = ['DÉSIGNATION DU SERVICE', 'POIDS NET (kg)', 'PRIX UNIT. (DT/kg)', 'MONTANT HT (DT)']
    const simplifiedBody = rows.map((r) => [
      `Transport Fitoura - Camion: ${r.original.matriculeCamion} / Chauffeur: ${r.original.chauffeur}`,
      (r.original.poidsNet || 0).toFixed(3),
      r.original.prixUnitaire.toFixed(3),
      (r.original.montantTotal || 0).toFixed(3),
    ])

    autoTable(doc, {
      head: [serviceHeader],
      body: simplifiedBody,
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [32, 52, 64], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 95 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: margin, right: margin },
    })

    // 📊 Totaux bien positionnés
    const finalY = (doc as any).lastAutoTable.finalY + 15
    const rightX = pageWidth - margin
    const labelX = rightX - 60

    doc.setFontSize(10)
    doc.text(`Total HT :`, labelX, finalY)
    doc.text(`${totalHT.toFixed(3)} DT`, rightX, finalY, { align: 'right' })
    doc.text(`TVA (${(COMPANY_INFO.tvaRate * 100).toFixed(0)}%) :`, labelX, finalY + 5)
    doc.text(`${totalTVA.toFixed(3)} DT`, rightX, finalY + 5, { align: 'right' })
    doc.text(`Droit de Timbre :`, labelX, finalY + 10)
    doc.text(`${COMPANY_INFO.stampDuty.toFixed(3)} DT`, rightX, finalY + 10, { align: 'right' })

    doc.setLineWidth(0.4)
    doc.line(labelX, finalY + 13, rightX, finalY + 13)

    doc.setFontSize(11).setFont('bold')
    doc.text(`NET À PAYER TTC :`, labelX, finalY + 20)
    doc.text(`${totalTTC.toFixed(3)} DT`, rightX, finalY + 20, { align: 'right' })

    // 🪶 Mentions légales & signature
    const footY = finalY + 35
    doc.setFontSize(8).setFont('normal')
    doc.text(`Arrêté la présente facture à la somme de : [montant en lettres] Dinars Tunisiens`, margin, footY)
    doc.text(`Conditions de paiement : 30 jours net date de facture.`, margin, footY + 8)
    doc.text(`Virement Bancaire (RIB) : ${COMPANY_INFO.rib}`, margin, footY + 12)
    doc.text(`Pénalités de retard : Taux légal en vigueur + 5 points.`, margin, footY + 16)
    doc.setFont('bold')
    doc.text(`Cachet et signature du fournisseur`, rightX, footY + 16, { align: 'right' })

    // 💾 Sauvegarde
    doc.save(`${filename}.pdf`)
  } catch (err) {
    console.error('Erreur export PDF :', err)
    alert('Une erreur est survenue lors de la génération du PDF.')
  }
}
