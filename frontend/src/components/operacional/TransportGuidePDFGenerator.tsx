import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TransportGuide } from '@/types/transportGuide';
import { useAuth } from '@/contexts/AuthContext';

interface TransportGuidePDFGeneratorProps {
  data: TransportGuide | {
    cnpj: string;
    empresa: string;
    numeroColete?: string;
    numeroArma: string;
    calibre: string;
    qtdMunicoes: number;
    origem: string;
    destino: string;
    trajeto: string;
    motivo: string;
  };
  onGenerate?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const TransportGuidePDFGenerator: React.FC<TransportGuidePDFGeneratorProps> = ({ 
  data, 
  onGenerate,
  className,
  children
}) => {
  const { user } = useAuth();
  const userName = user?.name || 'Operador';

  const generatePDF = async () => {
    try {
      // Criar um elemento temporário para renderizar o PDF
      const pdfElement = document.createElement('div');
      pdfElement.style.position = 'absolute';
      pdfElement.style.left = '-9999px';
      pdfElement.style.top = '0';
      pdfElement.style.width = '210mm';
      pdfElement.style.padding = '10mm';
      pdfElement.style.fontFamily = "'Inter', Arial, sans-serif";
      pdfElement.style.backgroundColor = 'white';
      pdfElement.style.color = 'black';
      pdfElement.style.boxSizing = 'border-box';
      
      pdfElement.innerHTML = `
        <!-- Cabeçalho Padrão da Empresa com Gradiente -->
        <div style="position: relative; margin-bottom: 12px; width: 100%; height: 75px; font-family: 'Inter', sans-serif;">
          <!-- Top Gradient Bar -->
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 12px; background: linear-gradient(to right, #FFCC00, #FF9900, #FF3333); z-index: 0;"></div>
          
          <!-- Logo Area -->
          <div style="position: absolute; top: 18px; left: 0; width: 100px; height: 50px; z-index: 20; display: flex; align-items: center; justify-content: center;">
               <img src="/logo-sistema.png" style="max-height: 48px; max-width: 100%; object-fit: contain;" onerror="this.style.display='none'" alt="Logo" />
          </div>

          <!-- Title Area -->
          <div style="position: absolute; top: 18px; left: 110px; right: 0; z-index: 20; display: flex; flex-direction: column; align-items: flex-end; justify-content: center;">
              <h1 style="color: black; font-weight: 800; text-transform: uppercase; font-size: 16px; margin: 0; letter-spacing: -0.5px; text-align: right; line-height: 1.1;">
                  PROMOVER VIGILÂNCIA PATRIMONIAL LTDA
              </h1>
              <p style="color: #666; margin: 2px 0 0 0; font-size: 9px; text-align: right;">CNPJ: 43.576.260/0001-12 | Tel: (31) 2559-1245</p>
              <p style="color: #666; margin: 1px 0 0 0; font-size: 9px; text-align: right;">Rua Cel. João Camargos, 267 - Centro - Contagem/MG</p>
          </div>
        </div>

        <!-- Título do Documento -->
        <div style="text-align: center; margin-bottom: 12px;">
          <h2 style="color: #1a1a1a; margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">GUIA DE TRANSPORTE DE ARMA</h2>
          <div style="border-bottom: 2px solid #FFCC00; width: 100px; margin: 4px auto;"></div>
        </div>

        <!-- Informações da Empresa e Arma (Lado a lado para salvar espaço vertical) -->
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
          <!-- Informações da Empresa -->
          <div style="flex: 1; background-color: #f8f9fa; padding: 10px; border-left: 3px solid #FFCC00; border-top: 1px solid #eee; border-right: 1px solid #eee; border-bottom: 1px solid #eee;">
            <h3 style="color: #333; margin: 0 0 6px 0; font-size: 11px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; text-transform: uppercase;">INFORMAÇÕES DA EMPRESA</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-weight: bold; color: #555; font-size: 10px;">CNPJ:</span>
              <span style="color: #333; font-size: 10px;">${data.cnpj}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #555; font-size: 10px;">Empresa/Filial:</span>
              <span style="color: #333; font-size: 10px;">${data.empresa}</span>
            </div>
          </div>

          <!-- Informações da Arma -->
          <div style="flex: 1.2; border: 1px solid #ddd; padding: 10px; background-color: #fff; border-left: 3px solid #FF9900;">
            <h3 style="color: #333; margin: 0 0 6px 0; font-size: 11px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; text-transform: uppercase;">INFORMAÇÕES DA ARMA</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px;">
              ${data.numeroColete ? `
              <div>
                <span style="font-weight: bold; color: #555; font-size: 9px; display: block;">Nº do Colete:</span>
                <span style="color: #333; font-size: 10px;">${data.numeroColete}</span>
              </div>
              ` : ''}
              <div>
                <span style="font-weight: bold; color: #555; font-size: 9px; display: block;">Nº da Arma:</span>
                <span style="color: #333; font-size: 10px;">${data.numeroArma}</span>
              </div>
              <div>
                <span style="font-weight: bold; color: #555; font-size: 9px; display: block;">Calibre:</span>
                <span style="color: #333; font-size: 10px;">${data.calibre}</span>
              </div>
              <div>
                <span style="font-weight: bold; color: #555; font-size: 9px; display: block;">Qtd Munições:</span>
                <span style="color: #333; font-size: 10px;">${data.qtdMunicoes}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Informações de Localização -->
        <div style="margin-bottom: 10px; border: 1px solid #ddd; padding: 10px; background-color: #fff; border-left: 3px solid #FF3333;">
          <h3 style="color: #333; margin: 0 0 6px 0; font-size: 11px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; text-transform: uppercase;">INFORMAÇÕES DE LOCALIZAÇÃO</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <span style="font-weight: bold; color: #555; display: block; margin-bottom: 2px; font-size: 9px;">Origem:</span>
              <div style="color: #333; font-size: 10px; padding: 5px 8px; background-color: #f8f9fa; border: 1px solid #eee; border-radius: 4px; white-space: pre-wrap; min-height: 25px;">${data.origem}</div>
            </div>
            <div>
              <span style="font-weight: bold; color: #555; display: block; margin-bottom: 2px; font-size: 9px;">Destino:</span>
              <div style="color: #333; font-size: 10px; padding: 5px 8px; background-color: #f8f9fa; border: 1px solid #eee; border-radius: 4px; white-space: pre-wrap; min-height: 25px;">${data.destino}</div>
            </div>
          </div>
          <div style="margin-top: 6px;">
            <span style="font-weight: bold; color: #555; display: block; margin-bottom: 2px; font-size: 9px;">Trajeto:</span>
            <div style="color: #333; font-size: 10px; padding: 5px 8px; background-color: #f8f9fa; border: 1px solid #eee; border-radius: 4px; white-space: pre-wrap;">${data.trajeto}</div>
          </div>
        </div>

        <!-- Motivo do Transporte -->
        <div style="margin-bottom: 10px; border: 1px solid #ddd; padding: 10px; background-color: #fff; border-left: 3px solid #1a1a1a;">
          <h3 style="color: #333; margin: 0 0 6px 0; font-size: 11px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; text-transform: uppercase;">MOTIVO DO TRANSPORTE</h3>
          <div style="color: #333; font-size: 10px; padding: 6px 8px; background-color: #f8f9fa; border-radius: 4px; border: 1px solid #eee;">
            ${data.motivo}
          </div>
        </div>

        <!-- Termo de Responsabilidade -->
        <div style="margin-bottom: 10px;">
          <h3 style="color: #333; margin: 0 0 6px 0; font-size: 11px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; text-transform: uppercase;">TERMO DE RESPONSABILIDADE</h3>
          <div style="background-color: #f8f9fa; padding: 10px; border: 1px solid #ddd;">
            <p style="text-align: justify; line-height: 1.4; margin: 0; color: #333; font-size: 9.5px;">
              Declaro que estou ciente das responsabilidades inerentes ao transporte de arma de fogo e me comprometo a cumprir 
              todas as normas e procedimentos estabelecidos pela <strong>Promover Vigilância Patrimonial LTDA</strong> e pela 
              legislação vigente. O transporte será realizado de forma segura e em conformidade com todas as regulamentações aplicáveis.
            </p>
          </div>
        </div>

        <!-- Campos de Assinatura -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; gap: 10px;">
          <div style="width: 49%; text-align: center;">
            <div style="border: 1px solid #ddd; padding: 10px; background-color: #fff;">
              <p style="margin: 0 0 15px 0; font-weight: bold; color: #333; font-size: 10px; text-transform: uppercase;">ASSINATURA DO RESPONSÁVEL</p>
              <div style="border-bottom: 1px solid #333; width: 100%; margin-bottom: 6px; height: 15px;"></div>
              <p style="margin: 0; font-size: 9px; color: #666;">Data: ____/____/________</p>
            </div>
          </div>

          <div style="width: 49%; text-align: center;">
            <div style="border: 1px solid #ddd; padding: 10px; background-color: #fff;">
              <p style="margin: 0 0 15px 0; font-weight: bold; color: #333; font-size: 10px; text-transform: uppercase;">ASSINATURA DO SUPERVISOR</p>
              <div style="border-bottom: 1px solid #333; width: 100%; margin-bottom: 6px; height: 15px;"></div>
              <p style="margin: 0; font-size: 9px; color: #666;">Data: ____/____/________</p>
            </div>
          </div>
        </div>

        <!-- Rodapé Centralizado com Usuário, Data e Página -->
        <div style="margin-top: 12px; text-align: center; border-top: 1px solid #ddd; padding-top: 8px;">
          <div style="font-size: 9px; color: #666; display: flex; justify-content: center; align-items: center; gap: 8px;">
            <span>Gerado por: <strong>${userName}</strong></span>
            <span>|</span>
            <span>Data: <strong>${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</strong></span>
            <span>|</span>
            <span>Página <strong>1 de 1</strong></span>
          </div>
        </div>
      `;

      document.body.appendChild(pdfElement);

      // Gerar canvas do HTML
      const canvas = await html2canvas(pdfElement, {
        scale: 2.0,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Remover elemento temporário
      document.body.removeChild(pdfElement);

      // Criar PDF de 1 página (A4)
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let printWidth = imgWidth;
      let printHeight = imgHeight;
      const maxA4Height = 297; // Altura total A4

      // Se a imagem passar da altura limite do A4, escala para baixo perfeitamente
      if (printHeight > maxA4Height) {
        const scaleFactor = maxA4Height / printHeight;
        printHeight = maxA4Height;
        printWidth = imgWidth * scaleFactor;
      }
      
      const xOffset = (210 - printWidth) / 2;
      
      pdf.addImage(imgData, 'PNG', xOffset, 0, printWidth, printHeight);

      // Salvar PDF
      const fileName = `Guia_Transporte_${data.numeroArma}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      if (onGenerate) {
        onGenerate();
      }

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  return (
    <button
      onClick={generatePDF}
      className={className || "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"}
      type="button"
    >
      {children || (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Gerar PDF
        </>
      )}
    </button>
  );
};

export default TransportGuidePDFGenerator;












