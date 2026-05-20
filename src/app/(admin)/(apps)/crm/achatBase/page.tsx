'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Col,
  Container,
  Form,
  FormControl,
  FormLabel,
  Modal,
  Row,
  Badge,
} from 'react-bootstrap'
import {
  TbEdit,
  TbTrash,
  TbPlus,
  TbEye,
  TbRefresh,
  TbPrinter,
  TbCash,
  TbFileTypePdf,
} from 'react-icons/tb'
import {
  ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  Row as TableRow,
  useReactTable,
} from '@tanstack/react-table'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'

// ======================================================================
// ⚙️ CONFIGURATION & CONSTANTES
// ======================================================================
const API_BASE_URL = 'http://localhost:8170/achats-base'
const CAISSE_API_BASE_URL = 'http://localhost:8170/caisse'
const PROPRIETAIRES_API_BASE_URL = 'http://localhost:8170/proprietaires'

const POIDS_CAISSE = 30
const WIBA_PAR_QFIZ = 16
const DENSITE_HUILE = 0.916
const POIDS_WIBA_DEFAUT = 27
const FRAIS_TRANSFORMATION_UNITAIRE = 0.2

// ======================================================================
// TYPES
// ======================================================================
interface AchatBaseInput {
  dateAchat: string
  nomPrenom: string
  numTel?: string
  nbreCaisse: number
  poidWiba: number
  quantiteOliveBrute: number
  quantiteOliveNet: number
  prixBase: number
  poidsHuileNetReel: number
  isPaid?: boolean
}

interface AchatBaseCalculated {
  quantiteHuileNet: number
  nisba: number
  ktou3: number
  coutAchatClient: number
  fraisTransformation: number
  prixTotalVenteHuile: number
  nombreQfza: number
}

interface AchatBasePayload extends AchatBaseInput, AchatBaseCalculated {}

interface AchatBaseData extends AchatBasePayload {
  _id: string
  createdAt?: string
  isPaid?: boolean
}

interface TotalsAchatBaseDto {
  totalOliveBrute: number
  totalOliveNet: number
  totalHuileNet: number
  totalCoutAchat: number
}

type AchatBaseType = {
  _id: string
  dateAchat?: string
  nomPrenom?: string
  numTel?: string
  nbreCaisse?: number
  poidWiba?: number
  quantiteOliveBrute?: number
  prixBase?: number
  quantiteOliveNet?: number
  quantiteHuileNet?: number
  poidsHuileNetReel?: number
  nisba?: number
  ktou3?: number
  coutAchatClient?: number
  fraisTransformation?: number
  prixTotalVenteHuile?: number
  isPaid?: boolean
  nombreQfza?: number
}

type AchatBaseTotalsType = {
  totalOliveBrute?: number
  totalOliveNet?: number
  totalHuileNet?: number
  totalCoutAchat?: number
}

type PaymentMode = 'note' | 'deduire_caisse'

interface PaymentFormState {
  mode: PaymentMode
  commentaire: string
}

interface FiltersState {
  clientName: string
  amountMin: string
  amountMax: string
  dateFrom: string
  dateTo: string
}

// ======================================================================
// TAXATION TUNISIENNE (Retenue à la source)
// ======================================================================

interface TaxInfo {
  taux: number;
  montantRetenu: number;
  montantNetAPayer: number;
  typeOperation: 'achat_olive' | 'achat_huile';
  statutFiscal: 'assujetti_tva' | 'non_assujetti_tva';
}

// Déterminer le taux de retenue selon le statut fiscal et la nature de l'opération
const getTauxRetenue = (
  statutFiscal: 'assujetti_tva' | 'non_assujetti_tva',
  typeOperation: 'achat_olive' | 'achat_huile'
): number => {
  if (typeOperation === 'achat_olive') {
    return statutFiscal === 'assujetti_tva' ? 1.0 : 1.5;
  }
  if (typeOperation === 'achat_huile') {
    return statutFiscal === 'assujetti_tva' ? 1.0 : 1.5;
  }
  return 0;
};

// Calculer la retenue à la source
const calculerRetenueSource = (
  montantHT: number,
  statutFiscal: 'assujetti_tva' | 'non_assujetti_tva',
  typeOperation: 'achat_olive' | 'achat_huile'
): TaxInfo => {
  const taux = getTauxRetenue(statutFiscal, typeOperation);
  const montantRetenu = (montantHT * taux) / 100;
  const montantNetAPayer = montantHT - montantRetenu;
  
  return {
    taux,
    montantRetenu: round2(montantRetenu),
    montantNetAPayer: round2(montantNetAPayer),
    typeOperation,
    statutFiscal,
  };
};

// ======================================================================
// COLONNES
// ======================================================================
const columnHelper = createColumnHelper<AchatBaseData>()

const COLUMNS_BASE: Array<{ Header: string; accessor: string; className: string }> = [
  { Header: '', accessor: 'select', className: 'text-center align-middle' },
  { Header: 'Date Achat', accessor: 'dateAchat', className: 'align-middle' },
  { Header: 'Client', accessor: 'nomPrenom', className: 'align-middle' },
  { Header: 'Olive Brut (kg)', accessor: 'quantiteOliveBrute', className: 'align-middle' },
  { Header: 'Caisses', accessor: 'nbreCaisse', className: 'align-middle' },
  { Header: 'Olive Net (kg)', accessor: 'quantiteOliveNet', className: 'fw-bold text-dark align-middle' },
  { Header: 'Huile Net (kg)', accessor: 'quantiteHuileNet', className: 'fw-semibold text-success align-middle' },
  { Header: 'Nisba (%)', accessor: 'nisba', className: 'align-middle' },
  { Header: 'Ktou3', accessor: 'ktou3', className: 'align-middle' },
  { Header: 'Prix Base (Dinar)', accessor: 'prixBase', className: 'align-middle' },
  { Header: 'Paiement Client', accessor: 'coutAchatClient', className: 'fw-bold text-primary align-middle' },
  { Header: 'Actions', accessor: 'actions', className: 'text-center align-middle' },
]

// ======================================================================
// UTILITAIRES
// ======================================================================
const round2 = (n: number) => Math.round(n * 100) / 100
const round4 = (n: number) => Math.round(n * 10000) / 10000
const formatNumber = (value: unknown) => Number(value || 0).toFixed(2)

const escapeHtml = (value: string) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const calculateNetQuantity = (oliveBrute: number, nbreCaisse: number) =>
  Math.max(0, oliveBrute - nbreCaisse * POIDS_CAISSE)

const calculateBruteQuantity = (oliveNet: number, nbreCaisse: number) =>
  Math.max(0, oliveNet + nbreCaisse * POIDS_CAISSE)

const calculateWibaAndQfza = (oliveNet: number, poidsWiba: number) => {
  const nWiba = oliveNet > 0 && poidsWiba > 0 ? oliveNet / poidsWiba : 0
  const nQfza = nWiba / WIBA_PAR_QFIZ
  return { nWiba, nQfza }
}

// ======================================================================
// CALCULS
// ======================================================================
const calculateMetrics = (input: AchatBaseInput): AchatBaseCalculated => {
  const oliveNet = Number(input.quantiteOliveNet || 0)
  const huileReelle = Number(input.poidsHuileNetReel || 0)
  const prixBase = Number(input.prixBase || 0)
  const poidsWiba = Number(input.poidWiba || POIDS_WIBA_DEFAUT)

  const { nQfza } = calculateWibaAndQfza(oliveNet, poidsWiba)

  const quantiteHuileNet = huileReelle
  const nisba = oliveNet > 0 && huileReelle > 0 ? (huileReelle / oliveNet) * 100 : 0

  let ktou3 = 0
  if (oliveNet > 0 && huileReelle > 0 && nQfza > 0) {
    const huileLitres = huileReelle / DENSITE_HUILE
    ktou3 = huileLitres / nQfza / 10
  }

  const coutAchatClient = huileReelle > 0 && prixBase > 0 ? huileReelle * prixBase : 0
  const fraisTransformation = oliveNet > 0 ? oliveNet * FRAIS_TRANSFORMATION_UNITAIRE : 0
  const prixTotalVenteHuile = coutAchatClient + fraisTransformation

  return {
    quantiteHuileNet: round2(quantiteHuileNet),
    nisba: round2(nisba),
    ktou3: round4(ktou3),
    coutAchatClient: round2(coutAchatClient),
    fraisTransformation: round2(fraisTransformation),
    prixTotalVenteHuile: round2(prixTotalVenteHuile),
    nombreQfza: round4(nQfza),
  }
}

// ======================================================================
// BON DE LIVRAISON & BON DE SORTIE (PDF style Odoo)
// ======================================================================

const buildBonLivraisonHtml = (achat: AchatBaseData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bon de Livraison</title>
  <style>
    @page { 
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: 'Helvetica', Arial, sans-serif;
      font-size: 12px;
      color: #2c3e50;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }
    .header h1 {
      color: #3498db;
      margin: 0;
      font-size: 24px;
    }
    .header .subtitle {
      color: #7f8c8d;
      font-size: 12px;
    }
    .company-info {
      text-align: center;
      margin-bottom: 20px;
      font-size: 10px;
      color: #7f8c8d;
    }
    .title-bon {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 20px 0;
      text-transform: uppercase;
      color: #2c3e50;
    }
    .info-section {
      margin-bottom: 20px;
      border: 1px solid #ddd;
      padding: 10px;
    }
    .info-row {
      display: flex;
      margin: 5px 0;
    }
    .info-label {
      width: 150px;
      font-weight: bold;
    }
    .info-value {
      flex: 1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #3498db;
      color: white;
      font-weight: bold;
    }
    .totals {
      margin-top: 20px;
      text-align: right;
    }
    .totals table {
      width: 300px;
      margin-left: auto;
    }
    .footer {
      margin-top: 40px;
      font-size: 10px;
      text-align: center;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
    .signature {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
    }
    .signature div {
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
    }
    .badge-success {
      background-color: #27ae60;
      color: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>HUILE D'OLIVE - HOUCINE AFFES</h1>
    <div class="subtitle">Huilerie Traditionnelle - Qualité Supérieure</div>
  </div>
  <div class="company-info">
    <div>Adresse : [Votre adresse] | Tél : [Votre téléphone] | Email : [Votre email]</div>
    <div>Matricule Fiscal : [Votre matricule] | Code TVA : [Votre code TVA]</div>
  </div>

  <div class="title-bon">BON DE LIVRAISON</div>

  <div class="info-section">
    <div class="info-row">
      <div class="info-label">N° Bon de Livraison :</div>
      <div class="info-value">BL-${achat._id.substring(0, 8).toUpperCase()}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Date :</div>
      <div class="info-value">${new Date(achat.dateAchat || '').toLocaleDateString('fr-FR')}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Client :</div>
      <div class="info-value"><strong>${escapeHtml(achat.nomPrenom || '-')}</strong></div>
    </div>
    <div class="info-row">
      <div class="info-label">Téléphone :</div>
      <div class="info-value">${escapeHtml(achat.numTel || '-')}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code Produit</th>
        <th>Désignation</th>
        <th>Quantité (kg)</th>
        <th>Prix Unitaire (DT)</th>
        <th>Montant HT (DT)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>H001</td>
        <td>Huile d'Olive Vierge Extra</td>
        <td>${formatNumber(achat.quantiteHuileNet)}</td>
        <td>${formatNumber(achat.prixBase)}</td>
        <td>${formatNumber(achat.coutAchatClient)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td><strong>Total HT :</strong></td>
        <td>${formatNumber(achat.coutAchatClient)} DT</td>
      </tr>
      <tr>
        <td><strong>TVA (0%) :</strong></td>
        <td>0.00 DT</td>
      </tr>
      <tr style="background-color: #f0f0f0;">
        <td><strong>Total TTC :</strong></td>
        <td><strong>${formatNumber(achat.coutAchatClient)} DT</strong></td>
      </tr>
    </table>
  </div>

  <div class="signature">
    <div>
      <div>____________________</div>
      <div>Cachet et signature</div>
      <div>du client</div>
    </div>
    <div>
      <div>____________________</div>
      <div>Signature</div>
      <div>du responsable</div>
    </div>
  </div>

  <div class="footer">
    <div>Merci de votre confiance - Règlement à réception de facture</div>
    <div>Document non valable pour facturation</div>
  </div>
</body>
</html>
`;

const buildBonSortieHtml = (achat: AchatBaseData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bon de Sortie</title>
  <style>
    @page { 
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: 'Helvetica', Arial, sans-serif;
      font-size: 12px;
      color: #2c3e50;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #e74c3c;
      padding-bottom: 10px;
    }
    .header h1 {
      color: #e74c3c;
      margin: 0;
      font-size: 24px;
    }
    .title-bon {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 20px 0;
      text-transform: uppercase;
      color: #2c3e50;
    }
    .info-section {
      margin-bottom: 20px;
      border: 1px solid #ddd;
      padding: 10px;
    }
    .info-row {
      display: flex;
      margin: 5px 0;
    }
    .info-label {
      width: 150px;
      font-weight: bold;
    }
    .info-value {
      flex: 1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #e74c3c;
      color: white;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      font-size: 10px;
      text-align: center;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
    .signature {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
    }
    .motif {
      margin: 20px 0;
      padding: 10px;
      background-color: #f9f9f9;
      border-left: 4px solid #e74c3c;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>HUILE D'OLIVE - HOUCINE AFFES</h1>
  </div>

  <div class="title-bon">BON DE SORTIE DE STOCK</div>

  <div class="info-section">
    <div class="info-row">
      <div class="info-label">N° Bon de Sortie :</div>
      <div class="info-value">BS-${achat._id.substring(0, 8).toUpperCase()}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Date :</div>
      <div class="info-value">${new Date(achat.dateAchat || '').toLocaleDateString('fr-FR')}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Destinataire :</div>
      <div class="info-value"><strong>${escapeHtml(achat.nomPrenom || '-')}</strong></div>
    </div>
  </div>

  <div class="motif">
    <strong>Motif de sortie :</strong> Vente d'huile d'olive - Transaction commerciale
  </div>

  <table>
    <thead>
      <tr>
        <th>Code Article</th>
        <th>Désignation</th>
        <th>Quantité Sortie (kg)</th>
        <th>Stock Avant (kg)</th>
        <th>Stock Après (kg)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>H001</td>
        <td>Huile d'Olive Vierge Extra</td>
        <td>${formatNumber(achat.quantiteHuileNet)}</td>
        <td>-</td>
        <td>-</td>
      </tr>
    </tbody>
  </table>

  <div class="signature">
    <div>
      <div>____________________</div>
      <div>Bon pour réception</div>
      <div>Cachet client</div>
    </div>
    <div>
      <div>____________________</div>
      <div>Bon pour sortie</div>
      <div>Responsable stock</div>
    </div>
  </div>

  <div class="footer">
    <div>Ce document atteste de la sortie de marchandises de nos stocks</div>
    <div>Document valable pour justification de sortie</div>
  </div>
</body>
</html>
`;

// ======================================================================
// IMPRESSION / EXPORT PDF
// ======================================================================
const buildThermalReceiptHtml = (row: AchatBaseData) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Impression Achat Base</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      body {
        margin: 0;
        padding: 8px;
        width: 72mm;
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: #000;
      }
      .center { text-align: center; }
      .title { font-size: 16px; font-weight: bold; margin-bottom: 6px; }
      .line { border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
      .label { font-weight: bold; }
      .footer { margin-top: 10px; text-align: center; font-size: 11px; }
    </style>
  </head>
  <body>
    <div class="center title">Achat Huile Base</div>
    <div class="center">${escapeHtml(String(row.dateAchat || '').substring(0, 10))}</div>
    <div class="line"></div>

    <div class="row"><span class="label">Client</span><span>${escapeHtml(row.nomPrenom || '-')}</span></div>
    <div class="row"><span class="label">Tél</span><span>${escapeHtml(row.numTel || '-')}</span></div>

    <div class="line"></div>

    <div class="row"><span class="label">Olive Brut</span><span>${formatNumber(row.quantiteOliveBrute)} kg</span></div>
    <div class="row"><span class="label">Caisses</span><span>${Number(row.nbreCaisse || 0).toFixed(0)}</span></div>
    <div class="row"><span class="label">Olive Net</span><span>${formatNumber(row.quantiteOliveNet)} kg</span></div>
    <div class="row"><span class="label">Huile Net</span><span>${formatNumber(row.quantiteHuileNet)} kg</span></div>
    <div class="row"><span class="label">Nisba</span><span>${formatNumber(row.nisba)} %</span></div>
    <div class="row"><span class="label">Ktou3</span><span>${Number(row.ktou3 || 0).toFixed(4)}</span></div>

    <div class="line"></div>

    <div class="row"><span class="label">Prix Base</span><span>${formatNumber(row.prixBase)} DT</span></div>
    <div class="row"><span class="label">Paiement Client</span><span>${formatNumber(row.coutAchatClient)} DT</span></div>
    <div class="row"><span class="label">Frais</span><span>${formatNumber(row.fraisTransformation)} DT</span></div>
    <div class="row"><span class="label">Total Transparent</span><span>${formatNumber(row.prixTotalVenteHuile)} DT</span></div>

    <div class="line"></div>
    <div class="footer">Merci</div>
    <script>
      window.onload = function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      };
    </script>
  </body>
</html>
`

// ======================================================================
// HELPERS API
// ======================================================================
const buildCaisseDetailsText = (achat: AchatBaseData, mode: PaymentMode, customComment: string) => {
  const modeText =
    mode === 'deduire_caisse'
      ? 'Déduit de la caisse'
      : 'Note sans déduction caisse'

  const details =
    `Paiement achat base | ID Achat: ${achat._id} | ` +
    `Client: ${achat.nomPrenom || '-'} | ` +
    `Huile: ${formatNumber(achat.quantiteHuileNet)} kg | ` +
    `Prix base: ${formatNumber(achat.prixBase)} DT | ` +
    `Montant total: ${formatNumber(achat.coutAchatClient)} DT | ` +
    `Date achat: ${String(achat.dateAchat || '').substring(0, 10)} | ` +
    `Mode: ${modeText}`

  return customComment?.trim()
    ? `${details} | Note: ${customComment.trim()}`
    : details
}

const syncAchatToProprietaire = async (achat: AchatBasePayload | AchatBaseData) => {
  const proprietairePayload = {
    nomPrenom: achat.nomPrenom || '',
    numTelephone: achat.numTel || '',
    type: 'proprietaire',
    dateCreation: achat.dateAchat,
    nombreCaisses: Number(achat.nbreCaisse || 0),
    quantiteOlive: Number(achat.quantiteOliveBrute || 0),
    quantiteOliveNet: Number(achat.quantiteOliveNet || 0),
    quantiteHuile: Number(achat.quantiteHuileNet || 0),
    kattou3: Number(achat.ktou3 || 0),
    nisba: Number(achat.nisba || 0),
    prixKg: Number(achat.prixBase || 0),
    prixFinal: Number(achat.coutAchatClient || 0),
    commentaire: 'Ajout automatique depuis achat base',
    sourceModule: 'achat-base',
    sourceId: (achat as AchatBaseData)._id || undefined,
  }

  const res = await fetch(PROPRIETAIRES_API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proprietairePayload),
  })

  if (!res.ok) {
    throw new Error("Erreur lors de l'ajout automatique au stock propriétaire")
  }
}

const sendPaymentToCaisse = async (
  achat: AchatBaseData,
  paymentMode: PaymentMode,
  commentaire: string
) => {
  const montant =
    paymentMode === 'deduire_caisse' ? Number(achat.coutAchatClient || 0) : 0

  const achatIdTag = `ID Achat: ${achat._id}`
  const detailsText = buildCaisseDetailsText(achat, paymentMode, commentaire)

  const payload = {
    motif: `Paiement achat base - ${achat.nomPrenom || 'Client'} - ${achatIdTag}`,
    montant,
    type: 'debit',
    date: new Date().toISOString(),
    uniqueId: `achat-base-payment-${achat._id}-${Date.now()}`,
    commentaire: detailsText,
    nomutilisatuer: 'system',
  }

  const res = await fetch(CAISSE_API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || "Erreur lors de l'envoi à la caisse")
  }
}

// ======================================================================
// TABLEAU
// ======================================================================

// Fonction pour créer les colonnes avec TanStack
const createAchatBaseColumns = (
  onView: (row: AchatBaseData) => void,
  onEdit: (row: AchatBaseData) => void,
  onDelete: (id: string) => void,
  onPrint: (row: AchatBaseData) => void,
  onPrintBonLivraison: (row: AchatBaseData) => void,
  onPrintBonSortie: (row: AchatBaseData) => void,
  onPayment: (row: AchatBaseData) => void
): ColumnDef<AchatBaseData>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        className="form-check-input form-check-input-light fs-14"
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="form-check-input form-check-input-light fs-14"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },

  {
    header: 'Date Achat',
    accessorKey: 'dateAchat',
    cell: (info) => String(info.getValue() || '').substring(0, 10),
  } as ColumnDef<AchatBaseData>,

  {
    header: 'Client',
    accessorKey: 'nomPrenom',
  } as ColumnDef<AchatBaseData>,

  {
    header: 'Olive Brut (kg)',
    accessorKey: 'quantiteOliveBrute',
    cell: (info) => `${(Number(info.getValue()) || 0).toFixed(2)}`,
  } as ColumnDef<AchatBaseData>,

  {
    header: 'Caisses',
    accessorKey: 'nbreCaisse',
    cell: (info) => `${(Number(info.getValue()) || 0).toFixed(0)}`,
  } as ColumnDef<AchatBaseData>,

  {
    header: 'Olive Net (kg)',
    accessorKey: 'quantiteOliveNet',
    cell: (info) => <span className="fw-bold text-dark">{(Number(info.getValue()) || 0).toFixed(2)}</span>,
  } as ColumnDef<AchatBaseData>,

  {
    header: 'Huile Net (kg)',
    accessorKey: 'quantiteHuileNet',
    cell: (info) => <span className="fw-semibold text-success">{(Number(info.getValue()) || 0).toFixed(2)}</span>,
  } as ColumnDef<AchatBaseData>,

  {
    header: 'Nisba (%)',
    accessorKey: 'nisba',
    cell: (info) => `${(Number(info.getValue()) || 0).toFixed(2)}%`,
  } as ColumnDef<AchatBaseData>,

  {
    header: 'Ktou3',
    accessorKey: 'ktou3',
    cell: (info) => `${(Number(info.getValue()) || 0).toFixed(4)}`,
  } as ColumnDef<AchatBaseData>,

  {
    header: 'Prix Base (Dinar)',
    accessorKey: 'prixBase',
    cell: (info) => `${(Number(info.getValue()) || 0).toFixed(2)}`,
  } as ColumnDef<AchatBaseData>,

  {
    header: 'Paiement Client',
    accessorKey: 'coutAchatClient',
    cell: (info) => <span className="fw-bold text-primary">{(Number(info.getValue()) || 0).toFixed(2)}</span>,
  } as ColumnDef<AchatBaseData>,

  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const data = row.original
      const rowPaid = Boolean(data.isPaid)

      return (
        <div className="d-flex gap-1 flex-wrap flex-md-nowrap align-items-center justify-content-center">
          <Button
            variant="default"
            size="sm"
            onClick={() => onView(data)}
            title="Voir détail"
          >
            <TbEye className="fs-lg" />
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onEdit(data)}
            title="Modifier"
          >
            <TbEdit className="fs-lg" />
          </Button>

          <Button
            variant={rowPaid ? 'success' : 'danger'}
            size="sm"
            onClick={() => onPayment(data)}
            title={`Statut: ${rowPaid ? 'payé' : 'non payé'}. Cliquer pour changer`}
            className="position-relative"
          >
            <TbCash className="fs-lg" />
            <span
              className={`position-absolute top-0 start-100 translate-middle p-1 border border-light rounded-circle ${
                rowPaid ? 'bg-success' : 'bg-danger'
              }`}
            >
              <span className="visually-hidden">Statut</span>
            </span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onPrint(data)}
            disabled={!rowPaid}
            title={!rowPaid ? "Impossible d'imprimer - Client non payé" : 'Imprimer le ticket'}
          >
            <TbPrinter className="fs-lg" />
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onPrintBonLivraison(data)}
            disabled={!rowPaid}
            title={!rowPaid ? "Impossible d'émettre - Client non payé" : 'Bon de livraison'}
          >
            <TbFileTypePdf className="fs-lg" />
            <span className="ms-1" style={{ fontSize: '10px' }}>BL</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onPrintBonSortie(data)}
            disabled={!rowPaid}
            title={!rowPaid ? "Impossible d'émettre - Client non payé" : 'Bon de sortie'}
          >
            <TbPrinter className="fs-lg" />
            <span className="ms-1" style={{ fontSize: '10px' }}>BS</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onDelete(data._id)}
            title="Supprimer"
          >
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      )
    },
    enableSorting: false,
  } as ColumnDef<AchatBaseData>,
]

// ======================================================================
// MODAL DETAIL
// ======================================================================
interface ViewAchatBaseModalProps {
  show: boolean
  handleClose: () => void
  data: AchatBaseData | null
}

const ViewAchatBaseModal: React.FC<ViewAchatBaseModalProps> = ({
  show,
  handleClose,
  data,
}) => {
  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Détail Achat Base</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!data ? (
          <p className="text-center text-muted mb-0">Aucune donnée.</p>
        ) : (
          <Container fluid>
            <Row className="g-3">
              <Col md={6}>
                <Card className="p-3 h-100">
                  <h6 className="mb-3">Informations générales</h6>
                  <div className="mb-2"><strong>Date :</strong> {String(data.dateAchat || '').substring(0, 10)}</div>
                  <div className="mb-2"><strong>Client :</strong> {data.nomPrenom || '-'}</div>
                  <div className="mb-2"><strong>Téléphone :</strong> {data.numTel || '-'}</div>
                  <div><strong>Prix Base :</strong> {formatNumber(data.prixBase)} Dinar</div>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="p-3 h-100">
                  <h6 className="mb-3">Quantités</h6>
                  <div className="mb-2"><strong>Olive Brut :</strong> {formatNumber(data.quantiteOliveBrute)} kg</div>
                  <div className="mb-2"><strong>Caisses :</strong> {Number(data.nbreCaisse || 0).toFixed(0)}</div>
                  <div className="mb-2"><strong>Olive Net :</strong> {formatNumber(data.quantiteOliveNet)} kg</div>
                  <div><strong>Huile Net :</strong> {formatNumber(data.quantiteHuileNet)} kg</div>
                </Card>
              </Col>

              <Col md={4}>
                <Card className="p-3 h-100 text-center">
                  <h6 className="mb-2">Coût Total Transparent</h6>
                  <div className="fw-bold text-success fs-5">
                    {formatNumber(data.prixTotalVenteHuile)} Dinar
                  </div>
                  <small className="text-muted">
                    ({formatNumber(data.fraisTransformation)} Dinar de frais inclus)
                  </small>
                </Card>
              </Col>

              <Col md={4}>
                <Card className="p-3 h-100 text-center">
                  <h6 className="mb-2">Paiement au Client</h6>
                  <div className="fw-bold text-primary fs-4">
                    {formatNumber(data.coutAchatClient)} Dinar
                  </div>
                </Card>
              </Col>

              <Col md={4}>
                <Card className="p-3 h-100 text-center">
                  <h6 className="mb-2">Rendement</h6>
                  <div className="mb-1"><strong>Nisba :</strong> {formatNumber(data.nisba)} %</div>
                  <div><strong>Ktou3 :</strong> {Number(data.ktou3 || 0).toFixed(4)}</div>
                </Card>
              </Col>
            </Row>
          </Container>
        )}
      </Modal.Body>
    </Modal>
  )
}

// ======================================================================
// MODAL PAIEMENT
// ======================================================================
interface PaiementModalProps {
  show: boolean
  handleClose: () => void
  achat: AchatBaseData | null
  handleConfirm: (mode: PaymentMode, commentaire: string) => Promise<void>
}

const PaiementModal: React.FC<PaiementModalProps> = ({
  show,
  handleClose,
  achat,
  handleConfirm,
}) => {
  const [formState, setFormState] = useState<PaymentFormState>({
    mode: 'note',
    commentaire: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (show) {
      setFormState({
        mode: 'note',
        commentaire: '',
      })
      setLoading(false)
    }
  }, [show, achat])

  const onSubmit = async () => {
    setLoading(true)
    try {
      await handleConfirm(formState.mode, formState.commentaire)
      handleClose()
    } catch (error) {
      console.error(error)
      alert('Erreur lors du paiement / envoi caisse.')
    } finally {
      setLoading(false)
    }
  }

  const montantCaisse =
    formState.mode === 'deduire_caisse' ? Number(achat?.coutAchatClient || 0) : 0

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Paiement Achat Base</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {!achat ? (
          <p className="mb-0 text-muted">Aucune ligne sélectionnée.</p>
        ) : (
          <>
            <div className="mb-3">
              <div><strong>Client :</strong> {achat.nomPrenom || '-'}</div>
              <div><strong>Date :</strong> {String(achat.dateAchat || '').substring(0, 10)}</div>
              <div><strong>Huile :</strong> {formatNumber(achat.quantiteHuileNet)} kg</div>
              <div><strong>Prix base :</strong> {formatNumber(achat.prixBase)} Dinar</div>
              <div><strong>Paiement client :</strong> {formatNumber(achat.coutAchatClient)} Dinar</div>
            </div>

            <Form>
              <Form.Group className="mb-3">
                <FormLabel>Mode</FormLabel>
                <div>
                  <Form.Check
                    type="radio"
                    id="payment-note"
                    name="paymentMode"
                    label="Mettre en note et envoyer à la caisse avec montant 0"
                    checked={formState.mode === 'note'}
                    onChange={() => setFormState((prev) => ({ ...prev, mode: 'note' }))}
                  />
                  <Form.Check
                    type="radio"
                    id="payment-deduire"
                    name="paymentMode"
                    label="Déduire le montant total de la caisse"
                    checked={formState.mode === 'deduire_caisse'}
                    onChange={() => setFormState((prev) => ({ ...prev, mode: 'deduire_caisse' }))}
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <FormLabel>Commentaire</FormLabel>
                <FormControl
                  as="textarea"
                  rows={3}
                  value={formState.commentaire}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, commentaire: e.target.value }))
                  }
                  placeholder="Commentaire optionnel..."
                />
              </Form.Group>

              <Card className="p-3 bg-light">
                <div><strong>Montant envoyé à la caisse :</strong> {formatNumber(montantCaisse)} Dinar</div>
                <div className="small text-muted mt-1">
                  Le mouvement caisse sera créé dans tous les cas, même si le montant = 0.
                </div>
              </Card>
            </Form>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button variant="success" onClick={onSubmit} disabled={loading || !achat}>
          {loading ? 'Envoi...' : 'Valider Paiement'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// ======================================================================
// MODAL AJOUT / MODIFICATION
// ======================================================================
interface NouveauAchatBaseModalProps {
  show: boolean
  handleClose: () => void
  handleSave: (payload: AchatBasePayload, id?: string) => Promise<void>
  dataToEdit: AchatBaseData | null
  existingClients?: string[]
}

const NouveauAchatBaseModal: React.FC<NouveauAchatBaseModalProps> = ({
  show,
  handleClose,
  handleSave,
  dataToEdit,
  existingClients = [],
}) => {
  const isEditMode = !!dataToEdit

  const getInitialInput = (data: AchatBaseData | null): AchatBaseInput => {
    const nbreCaisse = Number(data?.nbreCaisse || 0)
    const quantiteOliveBrute = Number(data?.quantiteOliveBrute || 0)
    const fallbackNet = calculateNetQuantity(quantiteOliveBrute, nbreCaisse)

    return {
      dateAchat: data?.dateAchat || new Date().toISOString().substring(0, 10),
      nomPrenom: data?.nomPrenom || '',
      numTel: data?.numTel || '',
      nbreCaisse,
      poidWiba: Number(data?.poidWiba || POIDS_WIBA_DEFAUT),
      quantiteOliveBrute,
      quantiteOliveNet: Number(data?.quantiteOliveNet ?? fallbackNet),
      prixBase: Number(data?.prixBase || 0),
      poidsHuileNetReel: Number(data?.poidsHuileNetReel ?? data?.quantiteHuileNet ?? 0),
      isPaid: Boolean(data?.isPaid ?? false),
    }
  }

  const [formData, setFormData] = useState<AchatBaseInput>(getInitialInput(dataToEdit))
  const [isLoading, setIsLoading] = useState(false)
  const [lastEdited, setLastEdited] = useState<'brute' | 'net'>('brute')
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Vérifier le mode dark
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark' ||
                     document.body.classList.contains('dark-mode');
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // Filtrer les suggestions de clients
  useEffect(() => {
    if (existingClients && formData.nomPrenom) {
      const filtered = existingClients.filter(client =>
        client.toLowerCase().includes(formData.nomPrenom.toLowerCase())
      );
      setClientSuggestions(filtered.slice(0, 10));
      setShowSuggestions(filtered.length > 0 && formData.nomPrenom.length > 0);
    }
  }, [formData.nomPrenom, existingClients]);

  useEffect(() => {
    if (show) {
      setFormData(getInitialInput(dataToEdit))
      setLastEdited('brute')
    }
  }, [show, dataToEdit])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let val: number | string | boolean = value

    if (
      [
        'quantiteOliveBrute',
        'quantiteOliveNet',
        'nbreCaisse',
        'poidWiba',
        'prixBase',
        'poidsHuileNetReel',
      ].includes(name)
    ) {
      val = value === '' ? 0 : parseFloat(value) || 0
    }

    if (name === 'quantiteOliveBrute') setLastEdited('brute')
    if (name === 'quantiteOliveNet') setLastEdited('net')

    setFormData((prev) => ({ ...prev, [name]: val }))
  }

  useEffect(() => {
    const oliveBrute = Number(formData.quantiteOliveBrute || 0)
    const oliveNet = Number(formData.quantiteOliveNet || 0)
    const nbreCaisse = Number(formData.nbreCaisse || 0)

    if (lastEdited === 'brute') {
      const computedNet = calculateNetQuantity(oliveBrute, nbreCaisse)
      if (computedNet !== oliveNet) {
        setFormData((prev) => ({ ...prev, quantiteOliveNet: computedNet }))
      }
    } else {
      const computedBrute = calculateBruteQuantity(oliveNet, nbreCaisse)
      if (computedBrute !== oliveBrute) {
        setFormData((prev) => ({ ...prev, quantiteOliveBrute: computedBrute }))
      }
    }
  }, [formData.quantiteOliveBrute, formData.quantiteOliveNet, formData.nbreCaisse, lastEdited])

  const calculatedMetrics = calculateMetrics({
    ...formData,
    poidWiba: Number(formData.poidWiba || POIDS_WIBA_DEFAUT),
    quantiteOliveNet: Number(formData.quantiteOliveNet || 0),
    poidsHuileNetReel: Number(formData.poidsHuileNetReel || 0),
    isPaid: Boolean(formData.isPaid ?? false),
  })

  const {
    nisba,
    ktou3,
    coutAchatClient,
    fraisTransformation,
    prixTotalVenteHuile,
  } = calculatedMetrics

  const handleSubmit = async () => {
    if (formData.quantiteOliveNet <= 0 || formData.poidsHuileNetReel <= 0 || formData.prixBase <= 0) {
      alert("Veuillez vérifier les quantités d'olive, d'huile nette et le prix de base.")
      return
    }

    setIsLoading(true)
    try {
      const payload: AchatBasePayload = {
        ...formData,
        poidWiba: Number(formData.poidWiba || POIDS_WIBA_DEFAUT),
        quantiteOliveNet: Number(formData.quantiteOliveNet || 0),
        poidsHuileNetReel: Number(formData.poidsHuileNetReel || 0),
        ...calculatedMetrics,
        quantiteHuileNet: Number(formData.poidsHuileNetReel || 0),
        isPaid: Boolean(formData.isPaid ?? false),
      }

      await handleSave(payload, dataToEdit?._id)
      handleClose()
    } catch (error) {
      console.error('Erreur lors de la sauvegarde :', error)
      alert('Erreur lors de la sauvegarde. Vérifiez les données.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditMode ? 'Modifier Achat Base' : 'Ajouter Achat Huile Base'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" style={{ position: 'relative' }}>
                <FormLabel>Client <span className="text-danger">*</span></FormLabel>
                <FormControl
                  type="text"
                  name="nomPrenom"
                  value={formData.nomPrenom}
                  onChange={handleChange}
                  onFocus={() => formData.nomPrenom && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  required
                  autoComplete="off"
                  style={{
                    backgroundColor: isDarkMode ? '#2b2b2b' : '#ffffff',
                    color: isDarkMode ? '#e0e0e0' : '#000000',
                    borderColor: isDarkMode ? '#404040' : '#ced4da',
                  }}
                />
                {showSuggestions && clientSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    backgroundColor: isDarkMode ? '#2b2b2b' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#404040' : '#ced4da'}`,
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                    {clientSuggestions.map((client, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: isDarkMode ? '#e0e0e0' : '#000000',
                          borderBottom: `1px solid ${isDarkMode ? '#404040' : '#eee'}`,
                        }}
                        onMouseDown={() => {
                          setFormData(prev => ({ ...prev, nomPrenom: client }));
                          setShowSuggestions(false);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#3a3a3a' : '#f5f5f5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#2b2b2b' : '#ffffff';
                        }}
                      >
                        {client}
                      </div>
                    ))}
                  </div>
                )}
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <FormLabel>Date Achat <span className="text-danger">*</span></FormLabel>
                <FormControl
                  type="date"
                  name="dateAchat"
                  value={formData.dateAchat}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <FormLabel>Olive Brut (kg) <span className="text-danger">*</span></FormLabel>
                <FormControl
                  type="number"
                  name="quantiteOliveBrute"
                  value={formData.quantiteOliveBrute || ''}
                  onChange={handleChange}
                  min="0"
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <FormLabel>Nbre Caisse (x{POIDS_CAISSE}kg) <span className="text-danger">*</span></FormLabel>
                <FormControl
                  type="number"
                  name="nbreCaisse"
                  value={formData.nbreCaisse || ''}
                  onChange={handleChange}
                  min="0"
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <FormLabel>Olive Net (kg) <span className="text-danger">*</span></FormLabel>
                <FormControl
                  type="number"
                  name="quantiteOliveNet"
                  value={formData.quantiteOliveNet || ''}
                  onChange={handleChange}
                  min="0"
                  required
                />
                <small className="text-muted">Modifiable à tout moment</small>
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3 bg-light p-2 rounded">
            <Col md={6}>
              <Form.Group className="mb-3 mb-md-0">
                <FormLabel>Poids Huile Net Réel (kg) <span className="text-danger">*</span></FormLabel>
                <FormControl
                  type="number"
                  name="poidsHuileNetReel"
                  value={formData.poidsHuileNetReel || ''}
                  onChange={handleChange}
                  min="0.1"
                  
                  className="border-primary"
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <div className="h-100 d-flex flex-column justify-content-center">
                <div className="fw-bold">Référence calcul</div>
                <div className="text-muted small">
                  Wiba par défaut = {Number(formData.poidWiba || POIDS_WIBA_DEFAUT).toFixed(2)} kg
                </div>
                <div className="text-muted small">
                  Nisba = (huile / olive net) × 100
                </div>
                <div className="text-muted small">
                  Ktou3 = (huile / densité) / qfza / 10
                </div>
              </div>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <FormLabel>Prix Base (Dinar/kg) <span className="text-danger">*</span></FormLabel>
                <FormControl
                  type="number"
                  name="prixBase"
                  value={formData.prixBase || ''}
                  onChange={handleChange}
                  min="0.1"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <FormLabel>Numéro de Téléphone (Optionnel)</FormLabel>
                <FormControl
                  type="text"
                  name="numTel"
                  value={formData.numTel || ''}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <hr />

          <Row className="g-3 align-items-stretch">
            <Col md={4}>
              <Card className="p-3 h-100 text-center border-success">
                <p className="mb-1 text-muted">Coût Total Transparent (Paiement Client + Frais)</p>
                <h5 className="text-success mb-1">{prixTotalVenteHuile.toFixed(2)} Dinar</h5>
                <span className="text-muted small">
                  ({fraisTransformation.toFixed(2)} Dinar de frais inclus)
                </span>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="p-3 h-100 text-center border-primary">
                <p className="mb-1 text-muted">Paiement au Client</p>
                <h4 className="text-primary mb-0">{coutAchatClient.toFixed(2)} Dinar</h4>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="p-3 h-100 text-center border-warning">
                <p className="mb-1 text-muted">Rendement</p>
                <h6 className="text-info mb-2">Nisba : {nisba.toFixed(2)} %</h6>
                <h6 className="text-warning mb-0">Ktou3 : {ktou3.toFixed(4)}</h6>
              </Card>
            </Col>
          </Row>

          <Row className="mt-3 text-center">
            <Col md={6}>
              <div className="fw-bold text-dark">Olive Net</div>
              <div>{Number(formData.quantiteOliveNet || 0).toFixed(2)} kg</div>
            </Col>
            <Col md={6}>
              <div className="fw-bold text-success">Huile Net Réelle</div>
              <div>{Number(formData.poidsHuileNetReel || 0).toFixed(2)} kg</div>
            </Col>
          </Row>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isLoading || coutAchatClient <= 0}
        >
          {isLoading ? 'Sauvegarde...' : isEditMode ? 'Sauvegarder' : 'Enregistrer Achat Base'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// ======================================================================
// PAGE PRINCIPALE
// ======================================================================
const Page: React.FC = () => {
  const [achatData, setAchatData] = useState<AchatBaseData[]>([])
  const [allTotals, setAllTotals] = useState<TotalsAchatBaseDto>({
    totalOliveBrute: 0,
    totalOliveNet: 0,
    totalHuileNet: 0,
    totalCoutAchat: 0,
  })

  const [filters, setFilters] = useState<FiltersState>({
    clientName: '',
    amountMin: '',
    amountMax: '',
    dateFrom: '',
    dateTo: '',
  })

  const [modalShow, setModalShow] = useState(false)
  const [viewModalShow, setViewModalShow] = useState(false)
  const [paymentModalShow, setPaymentModalShow] = useState(false)
  const [dataToEdit, setDataToEdit] = useState<AchatBaseData | null>(null)
  const [dataToView, setDataToView] = useState<AchatBaseData | null>(null)
  const [dataToPay, setDataToPay] = useState<AchatBaseData | null>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sorting, setSorting] = useState<SortingState>([])

  const fetchAchatBaseData = useCallback(async () => {
    setIsLoadingData(true)
    try {
      const [dataRes, totalsRes] = await Promise.all([
        fetch(API_BASE_URL),
        fetch(`${API_BASE_URL}/totals`),
      ])

      if (!dataRes.ok || !totalsRes.ok) {
        throw new Error("Erreur lors de la récupération des données de l'API.")
      }

      const data: AchatBaseData[] = await dataRes.json()
      const totals: TotalsAchatBaseDto = await totalsRes.json()

      setAchatData(data)
      setAllTotals(totals)
    } catch (error) {
      console.error('Erreur de chargement des données :', error)
      alert("Impossible de charger les données. Assurez-vous que le backend NestJS est lancé sur /achats-base.")
      setAchatData([])
      setAllTotals({
        totalOliveBrute: 0,
        totalOliveNet: 0,
        totalHuileNet: 0,
        totalCoutAchat: 0,
      })
    } finally {
      setIsLoadingData(false)
    }
  }, [])

  useEffect(() => {
    fetchAchatBaseData()
  }, [fetchAchatBaseData])

  const getUniqueClients = useCallback(() => {
    const clients = achatData
      .map(item => item.nomPrenom)
      .filter((name): name is string => !!name && name.trim() !== '');
    return [...new Set(clients)].sort();
  }, [achatData]);

  const uniqueClients = getUniqueClients();

  const filteredData: AchatBaseData[] = useMemo(() => {
    return achatData.filter((item) => {
      const clientMatch = String(item.nomPrenom || '')
        .toLowerCase()
        .includes(filters.clientName.trim().toLowerCase())

      const amount = Number(item.coutAchatClient || 0)
      const minOk = filters.amountMin === '' || amount >= Number(filters.amountMin || 0)
      const maxOk = filters.amountMax === '' || amount <= Number(filters.amountMax || 0)

      const itemDate = String(item.dateAchat || '').substring(0, 10)
      const fromOk = !filters.dateFrom || itemDate >= filters.dateFrom
      const toOk = !filters.dateTo || itemDate <= filters.dateTo

      return clientMatch && minOk && maxOk && fromOk && toOk
    })
  }, [achatData, filters])

  const exportAchatBaseToPDF = async (
    rows: AchatBaseType[],
    totals: AchatBaseTotalsType,
    filename = 'Rapport_Achats_Base'
  ) => {
    if (typeof window === 'undefined') return

    try {
      const { default: jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      const margin = 10
      let y = 20

      const formatValue = (value?: number, digits = 2) =>
        Number(value || 0).toFixed(digits)

      const formatDate = (value?: string) =>
        value ? new Date(value).toLocaleDateString('fr-FR') : '—'

      doc.setFontSize(14).setTextColor(0)
      doc.text('Rapport des Achats Base', pageWidth / 2, y, { align: 'center' })

      y += 10
      doc.setFontSize(10)
      doc.text(
        `Date : ${new Date().toLocaleDateString('fr-FR')} | Nombre de lignes : ${rows.length}`,
        margin,
        y
      )

      y += 8

      const headers = [
        'Date',
        'Nom & Prénom',
        'Téléphone',
        'Olive Brut (kg)',
        'Caisses',
        'Olive Net (kg)',
        'Huile Net (kg)',
        'Nisba (%)',
        'Ktou3',
        'Prix Base',
        'Paiement Client',
        'Statut',
      ]

      const body = rows.map((item) => [
        formatDate(item.dateAchat),
        item.nomPrenom || '—',
        item.numTel || '—',
        formatValue(item.quantiteOliveBrute, 2),
        formatValue(item.nbreCaisse, 0),
        formatValue(item.quantiteOliveNet, 2),
        formatValue(item.quantiteHuileNet, 2),
        formatValue(item.nisba, 2),
        Number(item.ktou3 || 0).toFixed(4),
        formatValue(item.prixBase, 2),
        formatValue(item.coutAchatClient, 2),
        item.isPaid ? 'Payé' : 'Non payé',
      ])

      autoTable(doc, {
        head: [headers],
        body,
        startY: y,
        theme: 'grid',
        styles: {
          fontSize: 8.5,
          textColor: 0,
          lineColor: 0,
          lineWidth: 0.1,
          cellPadding: 2,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: 0,
          lineColor: 0,
          lineWidth: 0.1,
          fontStyle: 'bold',
        },
        margin: { left: margin, right: margin },
      })

      const finalY = (doc as any).lastAutoTable.finalY + 10
      const labelX = pageWidth - 70
      const valueX = pageWidth - margin

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('RÉSUMÉ DES TOTAUX', labelX, finalY)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      let currentY = finalY + 6

      const addRow = (label: string, value: string) => {
        doc.text(label, labelX, currentY, { align: 'right' })
        doc.text(value, valueX, currentY, { align: 'right' })
        currentY += 6
      }

      addRow('Total Olive Brute :', `${formatValue(totals?.totalOliveBrute, 2)} kg`)
      addRow('Total Olive Nette :', `${formatValue(totals?.totalOliveNet, 2)} kg`)
      addRow('Total Huile Nette :', `${formatValue(totals?.totalHuileNet, 2)} kg`)
      addRow('Total Coût Achat :', `${formatValue(totals?.totalCoutAchat, 2)} TND`)

      doc.setDrawColor(150)
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)
      doc.setFontSize(8)

      doc.save(`${filename}.pdf`)
    } catch (err) {
      console.error('Erreur export PDF :', err)
      alert("Une erreur est survenue lors de la génération du PDF.")
    }
  }

  const handleExportPdf = async () => {
    await exportAchatBaseToPDF(filteredData, allTotals, 'Rapport_Achats_Base')
  }

  const handleSave = async (payload: AchatBasePayload, id?: string) => {
    const method = id ? 'PUT' : 'POST'
    const url = id ? `${API_BASE_URL}/${id}` : API_BASE_URL

    const safePayload = {
      ...payload,
      quantiteHuileNet: Number(payload.poidsHuileNetReel || 0),
      quantiteOliveNet: Number(payload.quantiteOliveNet || 0),
      quantiteOliveBrute: Number(payload.quantiteOliveBrute || 0),
      nbreCaisse: Number(payload.nbreCaisse || 0),
      poidWiba: Number(payload.poidWiba || POIDS_WIBA_DEFAUT),
      prixBase: Number(payload.prixBase || 0),
      poidsHuileNetReel: Number(payload.poidsHuileNetReel || 0),
      nisba: Number(payload.nisba || 0),
      ktou3: Number(payload.ktou3 || 0),
      coutAchatClient: Number(payload.coutAchatClient || 0),
      fraisTransformation: Number(payload.fraisTransformation || 0),
      prixTotalVenteHuile: Number(payload.prixTotalVenteHuile || 0),
      nombreQfza: Number(payload.nombreQfza || 0),
      isPaid: Boolean(payload.isPaid ?? false),
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safePayload),
    })

    if (!response.ok) {
      let message = response.statusText
      try {
        const errorBody = await response.json()
        message = errorBody.message || response.statusText
      } catch {
        //
      }
      throw new Error(`La requête a échoué (${response.status}): ${message}`)
    }

    const savedData: AchatBaseData = await response
      .json()
      .catch(() => ({ ...(safePayload as any), _id: id || '' }))

    if (!id) {
      try {
        await syncAchatToProprietaire(savedData._id ? savedData : ({ ...safePayload } as AchatBaseData))
      } catch (error) {
        console.error(error)
        alert("Achat enregistré, mais l'ajout automatique au stock propriétaire a échoué.")
      }
    }

    await fetchAchatBaseData()
    setSelectedRows([])
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet achat base ?')) return

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Erreur de suppression')

      await fetchAchatBaseData()
      setSelectedRows((prev) => prev.filter((rowId) => rowId !== id))
    } catch (error) {
      console.error('Erreur de suppression :', error)
      alert('Erreur lors de la suppression.')
    }
  }

  const handleEdit = (data: AchatBaseData) => {
    setDataToEdit(data)
    setModalShow(true)
  }

  const handleView = (data: AchatBaseData) => {
    setDataToView(data)
    setViewModalShow(true)
  }

  const handleOpenPayment = (data: AchatBaseData) => {
    setDataToPay(data)
    setPaymentModalShow(true)
  }

  const markAchatAsPaid = async (achat: AchatBaseData) => {
    const updatedPayload: AchatBasePayload = {
      dateAchat: achat.dateAchat,
      nomPrenom: achat.nomPrenom,
      numTel: achat.numTel || '',
      nbreCaisse: Number(achat.nbreCaisse || 0),
      poidWiba: Number(achat.poidWiba || POIDS_WIBA_DEFAUT),
      quantiteOliveBrute: Number(achat.quantiteOliveBrute || 0),
      quantiteOliveNet: Number(achat.quantiteOliveNet || 0),
      prixBase: Number(achat.prixBase || 0),
      poidsHuileNetReel: Number(achat.poidsHuileNetReel ?? achat.quantiteHuileNet ?? 0),
      quantiteHuileNet: Number(achat.quantiteHuileNet || 0),
      nisba: Number(achat.nisba || 0),
      ktou3: Number(achat.ktou3 || 0),
      coutAchatClient: Number(achat.coutAchatClient || 0),
      fraisTransformation: Number(achat.fraisTransformation || 0),
      prixTotalVenteHuile: Number(achat.prixTotalVenteHuile || 0),
      nombreQfza: Number(achat.nombreQfza || 0),
      isPaid: true,
    }

    await handleSave(updatedPayload, achat._id)
  }

  const handleConfirmPayment = async (mode: PaymentMode, commentaire: string) => {
    if (!dataToPay) return
    await sendPaymentToCaisse(dataToPay, mode, commentaire)
    await markAchatAsPaid(dataToPay)
    alert('Paiement envoyé à la caisse avec succès.')
  }

  const handlePrint = (data: AchatBaseData) => {
    const printWindow = window.open('', '_blank', 'width=420,height=700')
    if (!printWindow) {
      alert("Impossible d'ouvrir la fenêtre d'impression.")
      return
    }

    printWindow.document.open()
    printWindow.document.write(buildThermalReceiptHtml(data))
    printWindow.document.close()
  }

  const handlePrintBonLivraison = (data: AchatBaseData) => {
    if (!data.isPaid) {
      alert("Impossible d'émettre le bon de livraison - Client non payé");
      return;
    }
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert("Impossible d'ouvrir la fenêtre d'impression.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildBonLivraisonHtml(data));
    printWindow.document.close();
  };

  const handlePrintBonSortie = (data: AchatBaseData) => {
    if (!data.isPaid) {
      alert("Impossible d'émettre le bon de sortie - Client non payé");
      return;
    }
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert("Impossible d'ouvrir la fenêtre d'impression.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildBonSortieHtml(data));
    printWindow.document.close();
  };

  const handleModalClose = () => {
    setModalShow(false)
    setDataToEdit(null)
  }

  const handleViewClose = () => {
    setViewModalShow(false)
    setDataToView(null)
  }

  const handlePaymentClose = () => {
    setPaymentModalShow(false)
    setDataToPay(null)
  }

  const handleOpenCreate = () => {
    setDataToEdit(null)
    setModalShow(true)
  }

  const handleResetFilters = () => {
    setFilters({
      clientName: '',
      amountMin: '',
      amountMax: '',
      dateFrom: '',
      dateTo: '',
    })
  }

  const rendementMoyen =
    allTotals.totalOliveNet > 0
      ? (allTotals.totalHuileNet / allTotals.totalOliveNet) * 100
      : 0

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    )
  }

  // Créer les colonnes avec les handlers
  const columns = useMemo(
    () => createAchatBaseColumns(
      handleView,
      handleEdit,
      handleDelete,
      handlePrint,
      handlePrintBonLivraison,
      handlePrintBonSortie,
      handleOpenPayment
    ),
    [handleView, handleEdit, handleDelete, handlePrint, handlePrintBonLivraison, handlePrintBonSortie, handleOpenPayment]
  )

  // Créer l'instance table avec TanStack React Table
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      pagination: {
        pageIndex: Math.max(0, currentPage - 1),
        pageSize: rowsPerPage,
      },
      rowSelection: selectedRows.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
    },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function' 
        ? updater({ pageIndex: Math.max(0, currentPage - 1), pageSize: rowsPerPage })
        : updater
      setCurrentPage(newState.pageIndex + 1)
      setRowsPerPage(newState.pageSize)
    },
  })

  return (
    <Container fluid>
      <PageBreadcrumb title="Achats Huile Base" subtitle="Gestion" />

      <Row>
        <Col xl={12}>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                <h4 className="header-title mb-0">Achats Basés sur Huile Nette 🫗</h4>

                <div className="d-flex flex-wrap gap-2 ms-auto">
                  <Button variant="outline-secondary" onClick={handleExportPdf}>
                    <TbFileTypePdf className="me-1" />
                    Exporter PDF
                  </Button>

                  <Button variant="info" onClick={fetchAchatBaseData} disabled={isLoadingData}>
                    <TbRefresh className="me-1" />
                    {isLoadingData ? 'Chargement...' : 'Actualiser'}
                  </Button>

                  <Button variant="primary" onClick={handleOpenCreate}>
                    <TbPlus className="me-1" />
                    Nouveau Achat Base
                  </Button>
                </div>
              </div>

              <Card className="mb-3 border-0 bg-light-subtle">
                <CardBody className="py-3">
                  <Row className="g-3">
                    <Col md={3}>
                      <Form.Group>
                        <FormLabel>Filtrer par client</FormLabel>
                        <FormControl
                          type="text"
                          value={filters.clientName}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, clientName: e.target.value }))
                          }
                          placeholder="Nom du client..."
                        />
                      </Form.Group>
                    </Col>

                    <Col md={2}>
                      <Form.Group>
                        <FormLabel>Montant min</FormLabel>
                        <FormControl
                          type="number"
                          value={filters.amountMin}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, amountMin: e.target.value }))
                          }
                          placeholder="0"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={2}>
                      <Form.Group>
                        <FormLabel>Montant max</FormLabel>
                        <FormControl
                          type="number"
                          value={filters.amountMax}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, amountMax: e.target.value }))
                          }
                          placeholder="0"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={2}>
                      <Form.Group>
                        <FormLabel>Date début</FormLabel>
                        <FormControl
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                          }
                        />
                      </Form.Group>
                    </Col>

                    <Col md={2}>
                      <Form.Group>
                        <FormLabel>Date fin</FormLabel>
                        <FormControl
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                          }
                        />
                      </Form.Group>
                    </Col>

                    <Col md={1} className="d-flex align-items-end">
                      <Button variant="light" className="w-100 border" onClick={handleResetFilters}>
                        Reset
                      </Button>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              <div className="alert alert-info p-2 mb-3">
                <h6 className="mb-2 fw-bold text-center">Totaux Cumulés de l'Historique</h6>
                <Row className="text-center">
                  <Col sm={3} className="border-end">
                    <span className="fw-bold d-block">Olive Net (kg) :</span>
                    <span className="text-dark fs-5">{allTotals.totalOliveNet.toFixed(2)}</span>
                  </Col>
                  <Col sm={3} className="border-end">
                    <span className="fw-bold d-block">Huile Net Produite (kg) :</span>
                    <span className="text-success fs-5">{allTotals.totalHuileNet.toFixed(2)}</span>
                  </Col>
                  <Col sm={3} className="border-end">
                    <span className="fw-bold d-block">Paiement Total Client (Dinar) :</span>
                    <span className="text-primary fs-5">{allTotals.totalCoutAchat.toFixed(2)}</span>
                  </Col>
                  <Col sm={3}>
                    <span className="fw-bold d-block">Rendement Moyen :</span>
                    <span className="text-info fs-5">{rendementMoyen.toFixed(2)} %</span>
                  </Col>
                </Row>
              </div>

              {isLoadingData ? (
                <p className="text-center p-5">Chargement des données...</p>
              ) : filteredData.length === 0 ? (
                <p className="text-center text-muted p-4">Aucun achat de base enregistré.</p>
              ) : (
                <>
                  <div className="table-responsive">
                    <DataTable<AchatBaseData> table={table} emptyMessage="Aucun achat de base trouvé" />
                  </div>

                  <Card.Footer className="border-0">
                    <TablePagination
                      totalItems={filteredData.length}
                      start={table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                      end={Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredData.length)}
                      itemsName="achats"
                      showInfo
                      previousPage={table.previousPage}
                      canPreviousPage={table.getCanPreviousPage()}
                      pageCount={table.getPageCount()}
                      pageIndex={table.getState().pagination.pageIndex}
                      setPageIndex={table.setPageIndex}
                      nextPage={table.nextPage}
                      canNextPage={table.getCanNextPage()}
                      pageSize={table.getState().pagination.pageSize}
                      setPageSize={table.setPageSize}
                    />
                  </Card.Footer>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <NouveauAchatBaseModal
        show={modalShow}
        handleClose={handleModalClose}
        handleSave={handleSave}
        dataToEdit={dataToEdit}
        existingClients={uniqueClients}
      />

      <ViewAchatBaseModal
        show={viewModalShow}
        handleClose={handleViewClose}
        data={dataToView}
      />

      <PaiementModal
        show={paymentModalShow}
        handleClose={handlePaymentClose}
        achat={dataToPay}
        handleConfirm={handleConfirmPayment}
      />
    </Container>
  )
}

export default Page