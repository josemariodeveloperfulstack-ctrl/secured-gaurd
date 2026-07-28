import React from 'react';
import { Company } from '@/types/company';
import { formatCompanyFooterLines, resolveCompanyLogoUrl } from '@/utils/companyLogo';

interface StandardReportTemplateProps {
  title: string;
  company?: Company;
  children: React.ReactNode;
  showBranding?: boolean;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Frame visual dos relatórios oficiais.
 * Retrato: /report-background-template.png
 * Paisagem: /report-background-landscape.jpg
 *
 * Logo da empresa fica no bloco preto do cabeçalho.
 * No PDF, reportLayoutService reaplica template + logo + rodapé por página A4.
 */
export const StandardReportTemplate: React.FC<StandardReportTemplateProps> = ({
  title,
  company,
  children,
  showBranding = true,
  orientation,
}) => {
  const isLandscape = orientation === 'landscape';
  const templateSrc = isLandscape ? '/report-background-landscape.jpg' : '/report-background-template.png';
  const widthPx = isLandscape ? 1100 : 850;
  const pageHeightPx = isLandscape ? 778 : 1100;
  const containerClasses = isLandscape
    ? 'relative w-full max-w-[1100px] mx-auto text-black overflow-hidden'
    : 'relative w-full max-w-[850px] mx-auto text-black overflow-hidden';

  const logoUrl = resolveCompanyLogoUrl(company);
  const companyLabel = company?.sigla || company?.tradeName || company?.name || 'Secured Guard';
  const footerLines = formatCompanyFooterLines(company);

  if (!showBranding) {
    return (
      <div
        className={`${containerClasses} p-8 bg-white`}
        id="report-content"
        data-report-body
        style={{ fontFamily: 'Inter, sans-serif', minHeight: pageHeightPx }}
      >
        {children}
      </div>
    );
  }

  const fullSrc =
    typeof globalThis.window === 'undefined'
      ? templateSrc
      : `${globalThis.window.location.origin}${templateSrc}`;

  // Posição do logo no bloco preto (curva) do template oficial
  const logoBox = isLandscape
    ? { top: 10, left: 18, width: 118, height: 52 }
    : { top: 14, left: 22, width: 132, height: 72 };

  return (
    <div
      className={`${containerClasses} bg-white`}
      id="report-content"
      style={{
        fontFamily: 'Inter, sans-serif',
        minHeight: pageHeightPx,
        width: '100%',
        maxWidth: widthPx,
      }}
    >
      <img
        src={fullSrc}
        alt=""
        role="presentation"
        data-report-template="true"
        crossOrigin="anonymous"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: pageHeightPx,
          objectFit: 'fill',
          objectPosition: 'top center',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Logo no bloco preto do cabeçalho */}
      <div
        data-report-header-logo
        style={{
          position: 'absolute',
          top: logoBox.top,
          left: logoBox.left,
          width: logoBox.width,
          height: logoBox.height,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={companyLabel}
            crossOrigin="anonymous"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
            }}
          />
        ) : (
          <div
            style={{
              color: '#fbbf24',
              fontWeight: 800,
              fontSize: isLandscape ? 11 : 12,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              textAlign: 'center',
              lineHeight: 1.2,
              padding: '0 4px',
            }}
          >
            {companyLabel}
          </div>
        )}
      </div>

      {/* Rodapé oficial — nome abaixo da linha gradient (margin-top) */}
      <div
        data-report-footer
        style={{
          position: 'absolute',
          left: isLandscape ? 40 : 36,
          right: isLandscape ? 40 : 36,
          bottom: isLandscape ? 6 : 8,
          zIndex: 20,
          pointerEvents: 'none',
          textAlign: 'center',
          fontSize: isLandscape ? 8 : 9,
          color: '#1f1f1f',
          lineHeight: 1.35,
          // Empurra o bloco para baixo da faixa gradient (~19 mm no template)
          paddingTop: isLandscape ? 16 : 22,
        }}
      >
        {(footerLines.length > 0 ? footerLines : [companyLabel]).map((line, i) => (
          <div
            key={i}
            style={{
              fontWeight: i === 0 ? 700 : 400,
              fontSize: i === 0 ? (isLandscape ? 9 : 10) : undefined,
              marginTop: i === 0 ? 8 : 0,
            }}
          >
            {line}
          </div>
        ))}
      </div>

      <div
        className="relative"
        data-report-body
        style={{
          zIndex: 10,
          paddingTop: isLandscape ? 88 : 150,
          paddingBottom: isLandscape ? 80 : 105,
          paddingLeft: isLandscape ? 48 : 44,
          paddingRight: isLandscape ? 48 : 44,
          minHeight: pageHeightPx,
        }}
      >
        {children}
      </div>
    </div>
  );
};
