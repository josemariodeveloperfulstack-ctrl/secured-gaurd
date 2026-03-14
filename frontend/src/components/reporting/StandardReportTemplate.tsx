import React from 'react';
import { Company } from '@/types/company';

interface StandardReportTemplateProps {
    title: string;
    company?: Company;
    children: React.ReactNode;
    showBranding?: boolean;
    orientation?: 'portrait' | 'landscape';
}

/**
 * Usa os templates oficiais como fundo — sem desenhar nada.
 * Retrato: report-background-template.png
 * Paisagem: report-background-landscape.jpg
 * O conteúdo (children) é exibido na área branca central.
 */
export const StandardReportTemplate: React.FC<StandardReportTemplateProps> = ({
    title: _title,
    company: _company,
    children,
    showBranding = true,
    orientation
}) => {
    const isLandscape = orientation === 'landscape';
    const templateSrc = isLandscape ? '/report-background-landscape.jpg' : '/report-background-template.png';
    const containerClasses = isLandscape
        ? "relative min-h-[750px] w-full max-w-[1100px] mx-auto text-black overflow-hidden"
        : "relative min-h-[1100px] w-full max-w-[850px] mx-auto text-black overflow-hidden";

    if (!showBranding) {
        return (
            <div className={`${containerClasses} p-8`} id="report-content" style={{ fontFamily: 'Inter, sans-serif' }}>
                {children}
            </div>
        );
    }

    // Usar <img> em vez de background-image — html2canvas captura img com mais confiabilidade
    const fullSrc =
        typeof globalThis.window === 'undefined'
            ? templateSrc
            : `${globalThis.window.location.origin}${templateSrc}`;

    return (
        <div className={`${containerClasses} bg-white`} id="report-content" style={{ fontFamily: 'Inter, sans-serif' }}>
            <img
                src={fullSrc}
                alt=""
                role="presentation"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
                    objectPosition: 'center',
                    zIndex: 0,
                    pointerEvents: 'none'
                }}
            />
            {/* Área de conteúdo — margens para não sobrepor cabeçalho/rodapé do template */}
            <div
                className="relative"
                style={{
                    zIndex: 10,
                    paddingTop: isLandscape ? 70 : 90,
                    paddingBottom: isLandscape ? 50 : 60,
                    paddingLeft: isLandscape ? 48 : 40,
                    paddingRight: isLandscape ? 48 : 40
                }}
            >
                {children}
            </div>
        </div>
    );
};
