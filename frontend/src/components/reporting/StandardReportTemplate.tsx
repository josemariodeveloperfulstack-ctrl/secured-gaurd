import React from 'react';
import { Company } from '@/types/company';

interface StandardReportTemplateProps {
    title: string;
    company?: Company;
    children: React.ReactNode;
    showBranding?: boolean;
    orientation?: 'portrait' | 'landscape';
}

export const StandardReportTemplate: React.FC<StandardReportTemplateProps> = ({
    title,
    company,
    children,
    showBranding = true,
    orientation
}) => {
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const isLandscape = orientation === 'landscape';
    const containerClasses = isLandscape
        ? "relative bg-white pt-0 px-8 pb-8 min-h-[750px] w-full max-w-[1100px] mx-auto text-black overflow-hidden"
        : "relative bg-white pt-0 px-10 pb-10 min-h-[1100px] w-full max-w-[850px] mx-auto text-black overflow-hidden";

    return (
        <div className={containerClasses} id="report-content" style={{ fontFamily: 'Inter, sans-serif' }}>
            {showBranding && (
                <div className="relative w-full h-[150px] mb-8">
                    {/* Top Gradient Bar */}
                    <div className="absolute top-0 left-0 right-0 h-[28px] bg-gradient-to-r from-[#FFCC00] via-[#FF9900] to-[#FF3333] z-0"></div>

                    {/* Dark Curve Shape (Top-Left) */}
                    <div
                        className="absolute top-0 left-0 bg-[#1e1e1e] w-[260px] h-[130px] z-10"
                        style={{ borderBottomRightRadius: '90% 100%' }}
                    />

                    {/* Logo inside the curve - only in portrait */}
                    {!isLandscape && (
                        <div className="absolute top-[15px] left-[20px] w-[150px] h-[70px] z-20 flex items-center justify-center">
                            <img src="/logo-sistema.png" className="max-h-[60px] max-w-full object-contain" alt="Logo" />
                        </div>
                    )}

                    {/* Title Area */}
                    <div className="absolute top-0 left-[260px] right-0 h-[130px] z-20 flex flex-col items-end pr-4 justify-center pt-[28px]">
                        <h1 className="text-black font-black uppercase text-2xl lg:text-3xl m-0 tracking-tight leading-none text-right">
                            {title}
                        </h1>
                        <div className="flex items-center gap-3 mt-3 w-full justify-end">
                            <div className="h-[2px] w-[60px] bg-gradient-to-r from-[#FF9900] to-[#FF3333]"></div>
                            <p className="text-gray-600 font-bold uppercase tracking-widest text-xs m-0">
                                {company?.name || 'SECURED GUARD'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="relative z-30">
                {children}
            </div>

            {showBranding && (
                <div className="relative z-30 mt-12 pt-6">
                    {/* Bottom Gradient Line */}
                    <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#FFCC00] via-[#FF9900] to-[#FF3333] z-0"></div>

                    {/* Footer: portrait = line + company data; landscape = line only */}
                    {!isLandscape && (
                        <div className="flex justify-between items-center text-[10px] text-gray-500 pb-4">
                            <div className="text-left font-medium">
                                <p className="m-0 text-black font-bold uppercase">{company?.name || 'Secured Guard'}</p>
                                <p className="m-0">{company?.email || 'contato@securedguard.com.br'}</p>
                            </div>
                            <div className="text-center font-bold text-gray-400">
                                GERADO EM {currentDate} | SECURED GUARD INTELLIGENCE
                            </div>
                            <div className="text-right font-medium">
                                <p className="m-0">{company?.address || 'Endereço não informado'}</p>
                                <p className="m-0">{company?.phone ? `TEL: ${company.phone}` : ''}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
