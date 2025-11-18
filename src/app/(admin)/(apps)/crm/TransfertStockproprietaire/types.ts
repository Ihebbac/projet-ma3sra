export type ProprietaireType = {
    _id: string
    nomPrenom: string
    dateCreation: string
    nombreCaisses?: number
    quantiteOlive?: number
    quantiteOliveNet?: number
    quantiteHuile?: number
    kattou3?: number
    nisba?: number
    numCIN?: string
    numTelephone?: string
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
    date: string
    typeStock: 'olive' | 'huile'
    quantite: number
    clientNom: string
    motif: string
    details: string
    proprietaireId: string
    clientId: string
  }