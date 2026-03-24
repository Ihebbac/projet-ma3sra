export type ProprietaireType = {
  _id: string
  nomPrenom: string
  dateCreation?: string
  nombreCaisses?: number
  quantiteOlive?: number
  quantiteHuile?: number
  quantiteOliveNet?: number
  kattou3?: number
  nisba?: number
  stockRestant?: number
}
  
  export type ClientType = {
    _id: string
    nomPrenom: string
    commentaire: string;
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
    nomutilisatuer: string
  }
  
export type TransactionType = {
  _id: string
  date?: string
  dateCreation?: string
  createdAt?: string
  type?: 'huile' | 'olive'
  typeStock?: 'huile' | 'olive'
  quantite: number
  operation?: 'ajout' | 'retrait'
  motif: string
  commentaire?: string
  details?: string
  prixFinal?: number
  prix?: number
  nomPrenom?: string
  clientNom?: string
  proprietaireId?: string
}