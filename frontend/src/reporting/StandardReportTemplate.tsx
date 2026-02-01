import React from 'react';

interface StandardReportTemplateProps {
    title: string;
    children: React.ReactNode;
}

export const StandardReportTemplate: React.FC<StandardReportTemplateProps> = ({ title, children }) => {
    return (
        <div className="p-8 bg-white text-black font-sans">
            <div className="flex justify-between items-center border-b-2 border-yellow-500 pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-wider">Secured Guard</h1>
                    <h2 className="text-lg text-gray-600 font-medium">{title}</h2>
                </div>
                {/* Optional Logo Area */}
                <div className="text-right text-sm text-gray-500">
                    <p>Sistema de Gestão</p>
                    <p>{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            </div>

            <div className="report-body">
                {children}
            </div>

            <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
                Gerado automaticamente pelo sistema Secured Guard
            </div>
        </div>
    );
};
