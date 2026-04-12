import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import StockRequisitionModal, { StockRequisitionPrefill } from '@/components/stock/StockRequisitionModal';

interface CreateWarehouseRequisitionButtonProps {
  /** default | outline | secondary */
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
  onRecorded?: () => void;
}

/**
 * Abre o fluxo de requisição ao almoxarifado (uniformes/EPIs). Mesmo endpoint usado no Estoque.
 */
const CreateWarehouseRequisitionButton: React.FC<CreateWarehouseRequisitionButtonProps> = ({
  variant = 'default',
  size = 'default',
  className,
  label = 'Criar Requisição para o Almoxarifado',
  onRecorded,
}) => {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<StockRequisitionPrefill | null>(null);

  const handleOpen = () => {
    setPrefill({ lines: [{ stockItemId: '', quantity: 1 }] });
    setOpen(true);
  };

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={handleOpen}>
        <Package className="h-4 w-4 mr-2 shrink-0" />
        <span className="whitespace-normal text-left sm:whitespace-nowrap">{label}</span>
      </Button>
      <StockRequisitionModal
        open={open}
        onOpenChange={(v) => {
          if (!v) setPrefill(null);
          setOpen(v);
        }}
        prefill={prefill}
        onRecorded={onRecorded}
      />
    </>
  );
};

export default CreateWarehouseRequisitionButton;
