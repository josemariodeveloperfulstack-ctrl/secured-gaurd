import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkPost } from '@/services/workPostService';

interface WorkPostDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workPost: WorkPost | null;
  onConfirm: () => void;
}

export const WorkPostDeleteDialog: React.FC<WorkPostDeleteDialogProps> = ({
  open,
  onOpenChange,
  workPost,
  onConfirm
}) => {
  if (!open || !workPost) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div 
        className="w-full max-w-md rounded-xl border border-gray-600/60 bg-seguranca-black p-6 shadow-2xl space-y-4 text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-gray-600/30 pb-3">
          <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Confirmar Exclusão</h3>
            <p className="text-xs text-gray-400">Esta ação removerá o setor do sistema</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-300 py-1">
          <p>
            Tem certeza que deseja excluir o setor de trabalho <strong className="text-white">"{workPost.name}"</strong> (Código: <span className="font-mono text-amber-400">{workPost.postCode}</span>)?
          </p>
          <p className="text-xs text-gray-400 bg-red-950/40 p-2.5 rounded-lg border border-red-500/20 mt-2">
            ⚠️ O setor de trabalho será excluído permanentemente do cliente.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-600/30">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenChange(false);
            }}
            className="border-gray-600 px-4 text-xs text-white hover:bg-seguranca-graphite"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirm();
            }}
            className="bg-red-600 hover:bg-red-700 px-5 text-xs text-white shadow-lg shadow-red-600/20"
          >
            Excluir Setor
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkPostDeleteDialog; 