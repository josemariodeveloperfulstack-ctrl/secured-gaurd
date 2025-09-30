/**
 * Serviço para processamento de PDFs relacionados a funcionários
 * Extrai dados de documentos como carteira de trabalho, documentos pessoais, etc.
 */

export interface EmployeeDataFromPDF {
  name?: string;
  cpf?: string;
  rg?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  position?: string;
  admissionDate?: string;
  salary?: string;
  contractType?: string;
  workHours?: string;
  observations?: string;
  extractedFields: Record<string, any>;
}

export interface PDFProcessingResult {
  success: boolean;
  data?: EmployeeDataFromPDF;
  error?: string;
  confidence?: number;
  processingTime?: number;
}

class PDFProcessingService {
  
  /**
   * Processa um arquivo PDF e extrai dados do funcionário
   */
  async processEmployeePDF(file: File): Promise<PDFProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Simular processamento de PDF (implementação real usaria bibliotecas como pdf-parse ou Tesseract.js)
      const extractedData = await this.extractTextFromPDF(file);
      const employeeData = this.parseEmployeeData(extractedData);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        data: employeeData,
        confidence: this.calculateConfidence(employeeData),
        processingTime
      };
      
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar PDF',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Extrai texto do PDF (simulação)
   */
  private async extractTextFromPDF(file: File): Promise<string> {
    // Em uma implementação real, aqui usaria bibliotecas como:
    // - pdf-parse para extrair texto
    // - Tesseract.js para OCR em PDFs com imagens
    // - PDF.js para renderização e extração
    
    return new Promise((resolve) => {
      // Simular delay de processamento
      setTimeout(() => {
        // Texto simulado baseado em documentos típicos
        const simulatedText = `
        CARTA DE TRABALHO E PREVIDÊNCIA SOCIAL
        
        Nome: João Silva Santos
        CPF: 123.456.789-00
        RG: 12.345.678-9
        Data de Nascimento: 15/03/1985
        Endereço: Rua das Flores, 123, Centro, São Paulo/SP
        Telefone: (11) 99999-9999
        Email: joao.silva@email.com
        
        Cargo: Vigilante
        Data de Admissão: 01/09/2024
        Salário: R$ 2.500,00
        Jornada de Trabalho: 44 horas semanais
        Tipo de Contrato: CLT
        
        Observações: Funcionário contratado para reforço da equipe de segurança.
        `;
        resolve(simulatedText);
      }, 2000); // 2 segundos de simulação
    });
  }

  /**
   * Parseia os dados extraídos do texto
   */
  private parseEmployeeData(text: string): EmployeeDataFromPDF {
    const extractedFields: Record<string, any> = {};
    
    // Regex patterns para extrair dados
    const patterns = {
      name: /Nome[:\s]+([^\n\r]+)/i,
      cpf: /CPF[:\s]+([\d.-]+)/i,
      rg: /RG[:\s]+([\d.-]+)/i,
      email: /Email[:\s]+([^\n\r\s]+@[^\n\r\s]+)/i,
      phone: /Telefone[:\s]+([^\n\r]+)/i,
      birthDate: /Data de Nascimento[:\s]+([^\n\r]+)/i,
      address: /Endereço[:\s]+([^\n\r]+)/i,
      position: /Cargo[:\s]+([^\n\r]+)/i,
      admissionDate: /Data de Admissão[:\s]+([^\n\r]+)/i,
      salary: /Salário[:\s]+([^\n\r]+)/i,
      contractType: /Tipo de Contrato[:\s]+([^\n\r]+)/i,
      workHours: /Jornada de Trabalho[:\s]+([^\n\r]+)/i,
      observations: /Observações[:\s]+([^\n\r]+)/i
    };

    // Extrair cada campo
    Object.entries(patterns).forEach(([field, pattern]) => {
      const match = text.match(pattern);
      if (match && match[1]) {
        extractedFields[field] = match[1].trim();
      }
    });

    return {
      name: extractedFields.name,
      cpf: extractedFields.cpf,
      rg: extractedFields.rg,
      email: extractedFields.email,
      phone: extractedFields.phone,
      birthDate: extractedFields.birthDate,
      address: extractedFields.address,
      position: extractedFields.position,
      admissionDate: extractedFields.admissionDate,
      salary: extractedFields.salary,
      contractType: extractedFields.contractType,
      workHours: extractedFields.workHours,
      observations: extractedFields.observations,
      extractedFields
    };
  }

  /**
   * Calcula a confiança na extração baseada na quantidade de campos encontrados
   */
  private calculateConfidence(data: EmployeeDataFromPDF): number {
    const totalFields = 13; // Total de campos esperados
    const foundFields = Object.values(data).filter(value => 
      value && typeof value === 'string' && value.trim().length > 0
    ).length;
    
    return Math.round((foundFields / totalFields) * 100);
  }

  /**
   * Valida se os dados extraídos são válidos
   */
  validateExtractedData(data: EmployeeDataFromPDF): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar CPF
    if (data.cpf && !this.isValidCPF(data.cpf)) {
      errors.push('CPF inválido');
    }

    // Validar email
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Email inválido');
    }

    // Validar telefone
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Telefone inválido');
    }

    // Validar campos obrigatórios
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Nome é obrigatório');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida CPF
   */
  private isValidCPF(cpf: string): boolean {
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    // Algoritmo de validação do CPF
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
    
    return true;
  }

  /**
   * Valida email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida telefone
   */
  private isValidPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  }

  /**
   * Formata dados extraídos para uso no formulário
   */
  formatForForm(data: EmployeeDataFromPDF): Record<string, any> {
    return {
      name: data.name || '',
      cpf: data.cpf || '',
      rg: data.rg || '',
      email: data.email || '',
      phone: data.phone || '',
      birthDate: data.birthDate ? this.formatDate(data.birthDate) : '',
      address: data.address || '',
      position: data.position || '',
      admissionDate: data.admissionDate ? this.formatDate(data.admissionDate) : '',
      salary: data.salary || '',
      contractType: data.contractType || '',
      workHours: data.workHours || '',
      observations: data.observations || ''
    };
  }

  /**
   * Formata data para o formato esperado pelo formulário
   */
  private formatDate(dateString: string): string {
    // Converter de DD/MM/YYYY para YYYY-MM-DD
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateString;
  }

  /**
   * Limpa e formata CPF
   */
  formatCPF(cpf: string): string {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Limpa e formata telefone
   */
  formatPhone(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleanPhone.length === 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
  }
}

export const pdfProcessingService = new PDFProcessingService();
