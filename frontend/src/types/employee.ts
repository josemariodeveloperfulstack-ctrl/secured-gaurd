// Definição do tipo UUID para consistência
export type UUID = string;

export interface EmployeeDocument {
  id: UUID;
  type: string; // RG, CPF, CNH, etc.
  number: string;
  fileUrl?: string;
  issuedAt?: string;
  expiresAt?: string;
}

export interface EmployeeBankData {
  bank: string;
  agency: string;
  account: string;
  type: string; // Conta Corrente, Poupança, etc.
}

export interface EmployeeHistoryItem {
  id: UUID;
  type: 'admissao' | 'remanejamento' | 'premiacao' | 'advertencia' | 'falta' | 'afastamento';
  date: string;
  description: string;
  relatedDocumentUrl?: string;
}

// Interface principal compatível com o backend
export interface Employee {
  id: UUID; // UUID do backend
  name: string;
  cpf: string;
  rg: string;
  birthDate?: string; // LocalDate do backend
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  photoUrl?: string;
  currentScale?: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  } | string;
  registrationNumber?: string;
  hireDate?: string; // LocalDate do backend
  terminationDate?: string; // LocalDate do backend
  status?: string;
  notes?: string;
  
  // Campos adicionais do backend
  tituloEleitor?: string;
  carteiraIdentidade?: string;
  grauInstrucao?: string;
  pai?: string;
  mae?: string;
  naturalidade?: string;
  cep?: string;
  ctps?: string;
  cbo?: string;
  pis?: string;
  
  // Campos de CNH
  cnhNumber?: string;
  cnhExpirationDate?: string;
  cnhCategory?: string;
  
  // Campos de CTPS
  ctpsSeries?: string;
  ctpsIssueDate?: string;
  ctpsIssuingAgency?: string;
  ctpsRural?: string;
  
  // Documentos adicionais
  tituloEleitorZona?: string;
  tituloEleitorSecao?: string;
  carteiraIdentidadeOrgaoEmissor?: string;
  carteiraIdentidadeDataEmissao?: string;
  certificadoMilitar?: string;
  
  // Informações de trabalho
  cbo?: string;
  salario?: number; // BigDecimal do backend
  salarioPorExtenso?: string;
  periodoPagamento?: string;
  horarioTrabalho?: string;
  folgaSemanal?: string;
  
  // FGTS
  fgtsOptante?: boolean;
  fgtsDataOpcao?: string;
  fgtsBancoDepositario?: string;
  fgtsDataRetratacao?: string;
  
  // Empresa
  empresaNome?: string;
  empresaEndereco?: string;
  empresaCnpj?: string;
  vistoFiscalizacao?: string;
  
  // Informações pessoais adicionais
  nomePai?: string;
  nomeMae?: string;
  localNascimento?: string;
  grauInstrucao?: string;
  
  // PIS
  pisDataCadastro?: string;
  pisBancoDepositario?: string;
  pisEnderecoBanco?: string;
  pisCodigoBanco?: string;
  pisCodigoAgencia?: string;
  
  // Estrangeiros
  carteiraModelo19?: string;
  registroGeralEstrangeiro?: string;
  casadoBrasileiro?: boolean;
  nomeConjugeEstrangeiro?: string;
  temFilhosBrasileiros?: boolean;
  quantidadeFilhosBrasileiros?: number;
  dataChegadaBrasil?: string;
  naturalizado?: boolean;
  decretoNaturalizacao?: string;
  
  // Assinaturas e controle
  assinaturaFuncionario?: string;
  dataRescisao?: string;
  possuiWhatsapp?: boolean;
  caminhoPdf?: string;
  mesReferencia?: string;
  anoReferencia?: string;
  
  // Dados do cônjuge
  spouseName?: string;
  spouseCpf?: string;
  spouseRg?: string;
  spouseBirthDate?: string;
  spouseProfession?: string;
  spousePhone?: string;
  
  // Relacionamentos (apenas IDs como no backend)
  position?: { 
    id: UUID;
    name?: string;
    description?: string;
  };
  unit?: { 
    id: UUID;
    name?: string;
    description?: string;
  };
  user?: { id: UUID };
  company?: { 
    id: UUID;
    name?: string;
    cnpj?: string;
  };
  
  // Dados aninhados (opcionais)
  bankData?: EmployeeBankData;
  documents?: EmployeeDocument[];
  history?: EmployeeHistoryItem[];
  dependents?: Array<{
    name: string;
    relationship: string;
    birthDate: string;
    cpf?: string;
    rg?: string;
  }>;
  
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmployeeDTO {
  name: string;
  cpf: string;
  rg: string;
  birthDate?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  } | string;
  registrationNumber?: string;
  hireDate?: string;
  status?: string;
  notes?: string;
  
  // Campos adicionais
  tituloEleitor?: string;
  carteiraIdentidade?: string;
  grauInstrucao?: string;
  pai?: string;
  mae?: string;
  naturalidade?: string;
  cep?: string;
  ctps?: string;
  cbo?: string;
  pis?: string;
  
  // Campos de CNH
  cnhNumber?: string;
  cnhExpirationDate?: string;
  cnhCategory?: string;
  
  // Campos de CTPS
  ctpsSeries?: string;
  ctpsIssueDate?: string;
  ctpsIssuingAgency?: string;
  ctpsRural?: string;
  
  // Documentos adicionais
  tituloEleitorZona?: string;
  tituloEleitorSecao?: string;
  carteiraIdentidadeOrgaoEmissor?: string;
  carteiraIdentidadeDataEmissao?: string;
  certificadoMilitar?: string;
  
  // Informações de trabalho
  cbo?: string;
  salario?: number;
  salarioPorExtenso?: string;
  periodoPagamento?: string;
  horarioTrabalho?: string;
  folgaSemanal?: string;
  
  // FGTS
  fgtsOptante?: boolean;
  fgtsDataOpcao?: string;
  fgtsBancoDepositario?: string;
  fgtsDataRetratacao?: string;
  
  // Empresa
  empresaNome?: string;
  empresaEndereco?: string;
  empresaCnpj?: string;
  vistoFiscalizacao?: string;
  
  // Informações pessoais adicionais
  nomePai?: string;
  nomeMae?: string;
  localNascimento?: string;
  grauInstrucao?: string;
  
  // PIS
  pisDataCadastro?: string;
  pisBancoDepositario?: string;
  pisEnderecoBanco?: string;
  pisCodigoBanco?: string;
  pisCodigoAgencia?: string;
  
  // Estrangeiros
  carteiraModelo19?: string;
  registroGeralEstrangeiro?: string;
  casadoBrasileiro?: boolean;
  nomeConjugeEstrangeiro?: string;
  temFilhosBrasileiros?: boolean;
  quantidadeFilhosBrasileiros?: number;
  dataChegadaBrasil?: string;
  naturalizado?: boolean;
  decretoNaturalizacao?: string;
  
  // Assinaturas e controle
  assinaturaFuncionario?: string;
  dataRescisao?: string;
  possuiWhatsapp?: boolean;
  
  // Dados do cônjuge
  spouseName?: string;
  spouseCpf?: string;
  spouseRg?: string;
  spouseBirthDate?: string;
  spouseProfession?: string;
  spousePhone?: string;
  
  // Relacionamentos
  position?: { 
    id: string;
    name?: string;
    description?: string;
  };
  unit?: { 
    id: string;
    name?: string;
    description?: string;
  };
  user?: { id: string };
  company?: { 
    id: string;
    name?: string;
    cnpj?: string;
  };
  
  // Dados aninhados
  bankData?: EmployeeBankData;
  documents?: { type: string; number: string; file?: File }[];
  dependents?: Array<{
    name: string;
    relationship: string;
    birthDate: string;
    cpf?: string;
    rg?: string;
  }>;
}

export interface UpdateEmployeeDTO extends Partial<CreateEmployeeDTO> {
  id: string;
}