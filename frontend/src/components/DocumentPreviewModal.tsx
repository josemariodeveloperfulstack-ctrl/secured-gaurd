import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, ExternalLink, Loader2 } from 'lucide-react';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fileName: string;
    fileUrl: string;
    onDownload: () => void;
    loading?: boolean;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
    isOpen,
    onClose,
    title,
    fileName,
    fileUrl,
    onDownload,
    loading = false
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[90vw] md:max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-seguranca-graphite border-gray-700 flex flex-col">
                <DialogHeader className="p-4 border-b border-gray-700 flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col">
                        <DialogTitle className="text-gray-100 text-lg flex items-center gap-2">
                            {title}
                        </DialogTitle>
                        <span className="text-xs text-gray-400 mt-1 truncate max-w-[200px] md:max-w-md">
                            {fileName}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onDownload}
                            className="border-gray-600 text-gray-200 hover:bg-gray-800"
                            disabled={loading}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Baixar</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 bg-[#2a2a2a] relative min-h-[500px] h-[calc(100vh-180px)] md:h-[75vh]">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-seguranca-black/20">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-seguranca-yellow" />
                            <p className="font-bold uppercase tracking-widest text-[10px]">Carregando pré-visualização...</p>
                        </div>
                    ) : (
                        <div className="absolute inset-0 w-full h-full overflow-auto">
                            <iframe
                                src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                className="w-full h-full border-none"
                                title="Pré-visualização do Documento"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t border-gray-700 sm:justify-start flex-shrink-0">
                    <p className="text-[10px] text-gray-500 italic">
                        Dica: Se o documento não carregar no seu celular, clique no botão 'Baixar' acima.
                    </p>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
