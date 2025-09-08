import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const statusColor = {
  'PENDENTE': 'bg-yellow-500',
  'ASSINADO': 'bg-green-600',
  'VENCIDO': 'bg-red-600'
};

const DocumentViewerModal = ({ open, onOpenChange, document, onSign }) => {
  if (!document) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg p-4 sm:p-6 rounded-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{document.type}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div><span className="font-semibold">Funcionário:</span> {document.employee.name}</div>
          <div><span className="font-semibold">CPF:</span> {document.employee.cpf}</div>
          <div><span className="font-semibold">Status:</span> <Badge className={statusColor[document.status] + ' text-white'}>{document.status}</Badge></div>
          <div><span className="font-semibold">Gerado em:</span> {document.generatedAt}</div>
          <div><span className="font-semibold">Assinado em:</span> {document.signedAt || '--'}</div>
        </div>
        <div className="my-4 border rounded bg-muted p-4 text-center">
          {/* Simulação do PDF: pode ser um iframe ou apenas um box */}
          <div className="text-xs text-muted-foreground">[Pré-visualização do PDF: {document.type}]</div>
        </div>
        <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:gap-4">
          {document.status === 'PENDENTE' && (
            <Button onClick={() => onSign(document.id)} className="w-full sm:w-auto">Assinar Documento</Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewerModal; 