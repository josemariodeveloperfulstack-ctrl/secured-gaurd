import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Company } from '@/types/company';
import {
  formatCompanyFooterLines,
  resolveCompanyLogoUrl,
} from '@/utils/companyLogo';

export interface ReportConfig {
  title: string;
  filename: string;
  company?: Company;
  /** Quando true, o elemento já usa StandardReportTemplate. O fundo oficial é aplicado por página no PDF. */
  elementHasFullLayout?: boolean;
  /** Orientação do relatório. Default: 'portrait' (Retrato). */
  orientation?: 'portrait' | 'landscape';
  /** Função para checar se o usuário cancelou o processamento */
  isCancelled?: () => boolean;
}

function loadImageAsDataURL(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível preparar a imagem do relatório.'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const isJpeg = /\.jpe?g($|\?)/i.test(src) && !src.startsWith('data:image/png');
        resolve(canvas.toDataURL(isJpeg ? 'image/jpeg' : 'image/png', 0.95));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
    const absolute =
      src.startsWith('http') || src.startsWith('data:')
        ? src
        : `${window.location.origin}${src.startsWith('/') ? src : `/${src}`}`;
    img.src = absolute;
  });
}

function loadImageNaturalSize(
  src: string
): Promise<{ dataUrl: string; width: number; height: number; format: 'PNG' | 'JPEG' }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível preparar o logo.'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const isJpeg = /\.jpe?g($|\?)/i.test(src) && !src.startsWith('data:image/png');
        resolve({
          dataUrl: canvas.toDataURL(isJpeg ? 'image/jpeg' : 'image/png', 0.95),
          width,
          height,
          format: isJpeg ? 'JPEG' : 'PNG',
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error(`Falha ao carregar logo: ${src}`));
    img.src = src;
  });
}

/** Encaixa a imagem no retângulo mantendo proporção (object-fit: contain). */
function fitContain(
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  imgW: number,
  imgH: number
): { x: number; y: number; w: number; h: number } {
  if (!imgW || !imgH) return { x: boxX, y: boxY, w: boxW, h: boxH };
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return {
    x: boxX + (boxW - w) / 2,
    y: boxY + (boxH - h) / 2,
    w,
    h,
  };
}

/**
 * Quebras de página alinhadas ao fim de linhas de tabela —
 * evita cortar uma linha no meio (texto “sumindo” no topo da próxima página).
 */
function computeRowAwareBreaksPx(
  body: HTMLElement,
  canvasHeightPx: number,
  pageHeightPx: number
): number[] {
  const bodyHeight = Math.max(body.scrollHeight, body.offsetHeight, 1);
  const scaleY = canvasHeightPx / bodyHeight;
  const bodyTop = body.getBoundingClientRect().top;

  const rowBottoms = Array.from(body.querySelectorAll('tr'))
    .map((tr) => {
      const rect = tr.getBoundingClientRect();
      return (rect.bottom - bodyTop) * scaleY;
    })
    .filter((y) => y > 0 && y < canvasHeightPx)
    .sort((a, b) => a - b);

  const breaks: number[] = [0];
  let cursor = 0;

  while (cursor + pageHeightPx < canvasHeightPx - 1) {
    const limit = cursor + pageHeightPx;
    let snap = limit;
    // Última linha que termina antes do limite da página
    for (const bottom of rowBottoms) {
      if (bottom > cursor + 4 && bottom <= limit) {
        snap = bottom;
      }
      if (bottom > limit) break;
    }
    // Evita página quase vazia
    if (snap <= cursor + pageHeightPx * 0.25) {
      snap = limit;
    }
    // Evita avançar zero
    if (snap <= cursor + 1) {
      snap = Math.min(limit, canvasHeightPx);
    }
    breaks.push(snap);
    cursor = snap;
  }

  return breaks;
}

class ReportLayoutService {
  /**
   * Gera PDF A4 com o layout oficial do sistema:
   * - Retrato/paisagem: template oficial por página
   * - Logo no bloco preto do cabeçalho
   * - Rodapé centralizado sob a linha gradient (padrão dos relatórios)
   * - Quebra de página alinhada às linhas da tabela
   */
  async generatePremiumPDF(element: HTMLElement, config: ReportConfig): Promise<void> {
    try {
      if (config.isCancelled?.()) throw new Error('Processo cancelado pelo usuário');

      let isLandscape = config.orientation === 'landscape';
      if (!config.orientation) {
        const thCount = element.querySelectorAll('th').length;
        isLandscape = thCount > 4;
      }

      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;
      // Conteúdo acima da linha; abaixo dela: nome da empresa + dados + paginação
      const marginTop = isLandscape ? 26 : 36;
      // Reserva espaço da linha gradient (~19 mm) + bloco do rodapé
      const marginBottom = isLandscape ? 36 : 42;
      const marginLeft = isLandscape ? 14 : 14;
      const marginRight = isLandscape ? 14 : 14;
      const contentWidthMm = pageWidth - marginLeft - marginRight;
      const contentHeightMm = pageHeight - marginTop - marginBottom;

      const templateSrc = isLandscape
        ? '/report-background-landscape.jpg'
        : '/report-background-template.png';
      const templateFormat = isLandscape ? 'JPEG' : 'PNG';

      const logoBox = isLandscape
        ? { x: 6, y: 3.5, w: 38, h: 16 }
        : { x: 7, y: 5, w: 40, h: 22 };

      let targetElement: HTMLElement;
      let tempContainer: HTMLDivElement | null = null;
      const hiddenNodes: HTMLElement[] = [];

      if (config.elementHasFullLayout) {
        const body =
          (element.querySelector('[data-report-body]') as HTMLElement | null) ||
          (element.querySelector('#report-content > div.relative') as HTMLElement | null) ||
          element;

        element
          .querySelectorAll(
            'img[data-report-template], img[role="presentation"], [data-report-header-logo], [data-report-footer]'
          )
          .forEach((node) => {
            const el = node as HTMLElement;
            el.dataset.prevVisibility = el.style.visibility;
            el.style.visibility = 'hidden';
            hiddenNodes.push(el);
          });

        if (body !== element) {
          body.dataset.prevPaddingTop = body.style.paddingTop;
          body.dataset.prevPaddingBottom = body.style.paddingBottom;
          body.style.paddingTop = '4px';
          body.style.paddingBottom = '4px';
        }

        targetElement = body;
      } else {
        const containerWidth = isLandscape ? '1122px' : '800px';
        tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '0';
        tempContainer.style.top = '0';
        tempContainer.style.width = containerWidth;
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.padding = '24px 20px';
        tempContainer.style.fontFamily = 'Inter, sans-serif';
        tempContainer.style.zIndex = '99998';
        tempContainer.style.pointerEvents = 'none';

        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentTime = new Date().toLocaleTimeString('pt-BR');
        tempContainer.innerHTML = `
          <div data-report-body style="color:#111;">
            <div style="margin-bottom:16px;">
              <h1 style="margin:0;font-size:20px;font-weight:900;text-transform:uppercase;color:#111;">${config.title}</h1>
              <p style="margin:6px 0 0;font-size:11px;color:#4b5563;text-transform:uppercase;font-weight:700;">
                ${config.company?.name || 'Secured Guard'}
              </p>
              <p style="margin:4px 0 0;font-size:10px;color:#6b7280;">Gerado em ${currentDate} às ${currentTime}</p>
            </div>
            ${element.innerHTML}
          </div>
        `;
        document.body.appendChild(tempContainer);
        targetElement = tempContainer.querySelector('[data-report-body]') as HTMLElement;
      }

      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: isLandscape ? 1122 : 800,
      });

      hiddenNodes.forEach((el) => {
        el.style.visibility = el.dataset.prevVisibility || '';
        delete el.dataset.prevVisibility;
      });

      const bodyEl =
        (element.querySelector('[data-report-body]') as HTMLElement | null) ||
        (element.querySelector('#report-content > div.relative') as HTMLElement | null);
      if (bodyEl?.dataset.prevPaddingTop !== undefined) {
        bodyEl.style.paddingTop = bodyEl.dataset.prevPaddingTop;
        bodyEl.style.paddingBottom = bodyEl.dataset.prevPaddingBottom || '';
        delete bodyEl.dataset.prevPaddingTop;
        delete bodyEl.dataset.prevPaddingBottom;
      }

      if (tempContainer) {
        tempContainer.remove();
      }

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('O conteúdo do relatório está vazio ou não pôde ser renderizado.');
      }

      const templateDataUrl = await loadImageAsDataURL(templateSrc);

      let logoAsset: { dataUrl: string; width: number; height: number; format: 'PNG' | 'JPEG' } | null =
        null;
      const logoUrl = resolveCompanyLogoUrl(config.company);
      if (logoUrl) {
        try {
          logoAsset = await loadImageNaturalSize(logoUrl);
        } catch (err) {
          console.warn('Logo da empresa não pôde ser embutido no PDF:', err);
        }
      }

      const companyLabel =
        config.company?.sigla || config.company?.tradeName || config.company?.name || 'Secured Guard';
      const footerLines = formatCompanyFooterLines(config.company);

      const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');

      // Altura de uma página de conteúdo em pixels do canvas
      const pageHeightPx = (contentHeightMm / contentWidthMm) * canvas.width;
      const breakStarts = computeRowAwareBreaksPx(targetElement, canvas.height, pageHeightPx);
      const totalPages = Math.max(1, breakStarts.length);

      for (let pageIndex = 0; pageIndex < breakStarts.length; pageIndex++) {
        if (config.isCancelled?.()) throw new Error('Processo cancelado pelo usuário');
        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          templateDataUrl,
          templateFormat,
          0,
          0,
          pageWidth,
          pageHeight,
          'PAGE_TEMPLATE',
          'FAST'
        );

        if (logoAsset) {
          const fitted = fitContain(
            logoBox.x,
            logoBox.y,
            logoBox.w,
            logoBox.h,
            logoAsset.width,
            logoAsset.height
          );
          pdf.addImage(
            logoAsset.dataUrl,
            logoAsset.format,
            fitted.x,
            fitted.y,
            fitted.w,
            fitted.h,
            `LOGO_${pageIndex}`,
            'FAST'
          );
        } else {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(isLandscape ? 8 : 9);
          pdf.setTextColor(251, 191, 36);
          const label = companyLabel.length > 18 ? `${companyLabel.slice(0, 16)}…` : companyLabel;
          pdf.text(label.toUpperCase(), logoBox.x + logoBox.w / 2, logoBox.y + logoBox.h / 2 + 1.5, {
            align: 'center',
          });
        }

        const sourceY = breakStarts[pageIndex];
        const nextBreak =
          pageIndex + 1 < breakStarts.length ? breakStarts[pageIndex + 1] : canvas.height;
        const sourceHeightPx = Math.max(1, Math.min(nextBreak - sourceY, canvas.height - sourceY));

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.max(1, Math.ceil(sourceHeightPx));
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) {
          throw new Error('Falha ao fatiar o conteúdo do relatório.');
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeightPx,
          0,
          0,
          canvas.width,
          sourceHeightPx
        );

        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
        const sliceHeightMm = (sourceHeightPx * contentWidthMm) / canvas.width;

        pdf.addImage(
          sliceData,
          'JPEG',
          marginLeft,
          marginTop,
          contentWidthMm,
          Math.min(sliceHeightMm, contentHeightMm),
          `CONTENT_${pageIndex}`,
          'FAST'
        );

        // Rodapé oficial no FUNDO (abaixo da linha gradient do template).
        // Template retrato: faixa colorida ~18–20 mm do fundo (medido no PNG).
        const lineHeight = isLandscape ? 2.7 : 2.9;
        const pageLabel = `Página ${pageIndex + 1} de ${totalPages}`;
        const gradientLineFromBottom = isLandscape ? 14 : 19.5;
        // Margin-top abaixo da linha → nome da empresa não encosta na faixa.
        const marginTopBelowLine = isLandscape ? 4.5 : 5.5;
        let y = pageHeight - gradientLineFromBottom + marginTopBelowLine;

        pdf.setTextColor(30, 30, 30);
        if (footerLines.length > 0) {
          for (let i = 0; i < footerLines.length; i++) {
            if (y > pageHeight - 4) break;
            if (i === 0) {
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(isLandscape ? 7 : 7.5);
            } else {
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(isLandscape ? 6 : 6.3);
            }
            pdf.text(footerLines[i], pageWidth / 2, y, { align: 'center' });
            y += lineHeight;
          }
        }

        // Paginação centralizada (não à direita)
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(isLandscape ? 6.5 : 7);
        pdf.setTextColor(55, 55, 55);
        const pageY = Math.min(y + 1.5, pageHeight - 2.2);
        pdf.text(pageLabel, pageWidth / 2, pageY, { align: 'center' });

        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      pdf.save(config.filename || 'relatorio.pdf');
    } catch (error) {
      console.error('Error generating premium PDF:', error);
      throw error;
    }
  }
}

export const reportLayoutService = new ReportLayoutService();
