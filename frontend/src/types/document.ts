export type DocumentType = 
  | 'CPF'
  | 'RG'
  | 'TITULO_ELEITOR'
  | 'CERTIDAO_NASCIMENTO'
  | 'CERTIDAO_CASAMENTO'
  | 'CTPS'
  | 'PIS_PASEP'
  | 'CARTEIRA_PROFISSIONAL'
  | 'CNH'
  | 'CERTIFICACAO_PROFISSIONAL'
  | 'DIPLOMA'
  | 'ASO'
  | 'EXAME_MEDICO'
  | 'CRLV'
  | 'IPVA'
  | 'SEGURO'
  | 'HOLERITE'
  | 'COMPROVANTE_PAGAMENTO'
  | 'OUTROS';

export interface Document {
  id: string;
  employeeId: string;
  type: DocumentType;
  number: string;
  issueDate: string;
  expirationDate?: string;
  fileUrl?: string;
  fileName?: string;
  description?: string;
  signed: boolean;
  signatureDate?: string;
  signedBy?: string;
  createdAt: string;
  updatedAt: string;
}