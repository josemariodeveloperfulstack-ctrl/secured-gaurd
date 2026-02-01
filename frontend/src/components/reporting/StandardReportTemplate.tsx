import React from 'react';
import { Company } from '@/types/company';

interface StandardReportTemplateProps {
    title: string;
    company?: Company;
    children: React.ReactNode;
    showBranding?: boolean;
}

export const StandardReportTemplate: React.FC<StandardReportTemplateProps> = ({
    title,
    company,
    children,
    showBranding = true
}) => {
    const currentDate = new Date().toLocaleDateString('pt-BR');

    return (
        <div className="bg-white p-8 min-h-[1100px] w-full max-w-[850px] mx-auto text-black shadow-lg" id="report-content">
            {showBranding && (
                <div className="relative mb-10 border-b-4 border-transparent w-full">
                    {/* Gradient Bar */}
                    <div className="h-[30px] w-full bg-gradient-to-r from-[#FFCC00] via-[#FF9900] to-[#FF3333]"></div>

                    {/* Curved Logo Area (Simulated) */}
                    <div className="absolute top-0 left-0 h-[80px] w-[150px] bg-[#1a1a1a] rounded-br-[50px] flex items-center justify-center z-10">
                        <img src="/logo-sistema.png" className="max-w-[100px] max-height-[50px] object-contain" alt="Logo" />
                    </div>

                    {/* Title Area */}
                    <div className="text-center mt-10 pt-2">
                        <h1 className="text-[#1a1a1a] m-0 text-2xl font-extrabold uppercase tracking-tight">{title}</h1>
                        <p className="text-gray-500 m-1 text-xs font-medium">
                            {company?.name || 'Secured Guard'} | Relatório Oficial
                        </p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="mt-8 min-h-[800px]">
                {children}
            </div>

            {showBranding && (
                <div className="mt-10 border-t border-gray-100 pt-6 text-center text-gray-500 text-[10px]">
                    <p className="m-0 font-bold text-gray-800">{company?.name || 'Secured Guard'}</p>
                    <p className="m-0">
                        {company?.address || 'Endereço não informado'}
                        {company?.phone ? ` | Tel: ${company.phone}` : ''}
                    </p>
                    <p className="m-0">{company?.email || 'contato@securedguard.com.br'}</p>

                    {/* Bottom Gradient Bar */}
                    <div className="mt-4 h-1 w-full bg-gradient-to-r from-[#FFCC00] via-[#FF9900] to-[#FF3333]"></div>

                    <p className="mt-2 text-gray-400">
                        Gerado automaticamente em {currentDate} pelo Sistema Secured Guard
                    </p>
                </div>
            )}
        </div>
    );
};
