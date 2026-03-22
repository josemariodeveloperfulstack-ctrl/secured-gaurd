import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  HandMetal, 
  Link as LinkIcon, 
  Clock, 
  CheckCircle, 
  XCircle,
  QrCode,
  Smartphone,
  Tablet,
  MessageCircle,
  Mail as MailIcon
} from 'lucide-react';
import { deliveryService } from '@/services/deliveryService';
import { employeeService, Employee } from '@/services/employeeService';
import { Product, productService } from '@/services/productService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import SignaturePad from '@/components/SignaturePad';

export default function DeliveryManagement() {
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  
  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empData, prodData, delData] = await Promise.all([
        employeeService.getAllEmployees(),
        productService.getAllProducts(),
        deliveryService.getDeliveries()
      ]);
      setEmployees(empData);
      setProducts(prodData);
      setDeliveries(delData);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDelivery = async () => {
    if (!selectedEmployeeId || items.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione um funcionário e pelo menos um item.",
        variant: "warning",
      });
      return;
    }

    try {
      const delivery = await deliveryService.createDelivery({
        employeeId: selectedEmployeeId,
        items: items
      });
      
      toast({
        title: "Sucesso",
        description: "Entrega criada com sucesso!",
      });
      
      setDeliveries([delivery, ...deliveries]);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar entrega.",
        variant: "destructive",
      });
    }
  };

  const handleSignTablet = async (signatureBase64: string) => {
    if (!selectedDelivery) return;

    try {
      await deliveryService.signTablet(selectedDelivery.id, {
        signatureBase64,
        origin: 'TABLET'
      });
      
      toast({
        title: "Sucesso",
        description: "Assinatura capturada com sucesso!",
      });
      
      setIsSigningModalOpen(false);
      loadData(); // Refresh list
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar assinatura.",
        variant: "destructive",
      });
    }
  };

  const addItem = (product: Product) => {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { productId: product.id, quantity: 1 }]);
    }
    setItemSearch('');
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.productId !== productId));
  };

  const resetForm = () => {
    setSelectedEmployeeId('');
    setItems([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
      case 'SIGNED': return <Badge className="bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Assinado</Badge>;
      case 'EXPIRED': return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Expirado</Badge>;
      case 'CANCELLED': return <Badge variant="secondary" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const copyRemoteLink = (delivery: any) => {
    const link = `${window.location.origin}/remote-sign/${delivery.tokenSignature}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copiado",
      description: "O link de assinatura remota foi copiado para a área de transferência.",
    });
  };

  const sendWhatsApp = (delivery: any) => {
    const link = `${window.location.origin}/remote-sign/${delivery.tokenSignature}`;
    const employeeName = delivery.employee?.name || 'Funcionário';
    const message = `Olá ${employeeName}! %0A%0AFavor assinar o comprovante de recebimento de materiais através do link abaixo:%0A${link}%0A%0AAtenciosamente, %0AAlmoxarifado`;
    
    // Obter telefone se existir
    const phone = delivery.employee?.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}&text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const sendEmail = (delivery: any) => {
    const link = `${window.location.origin}/remote-sign/${delivery.tokenSignature}`;
    const employeeName = delivery.employee?.name || 'Funcionário';
    const subject = 'Assinatura de Recebimento de Materiais';
    const body = `Olá ${employeeName},\n\nFavor assinar o comprovante de recebimento de materiais através do link abaixo:\n${link}\n\nAtenciosamente,\nAlmoxarifado`;
    
    const email = delivery.employee?.email || '';
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciamento de Entregas</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Entrega
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma entrega registrada.
                  </TableCell>
                </TableRow>
              ) : (
                deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>{new Date(delivery.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="font-medium">{delivery.employee?.name}</TableCell>
                    <TableCell>{delivery.items?.length || 0} itens</TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell>
                      {delivery.origin === 'TABLET' ? <Badge variant="outline" className="flex items-center gap-1 w-fit"><Tablet className="w-3 h-3" /> Tablet</Badge> : 
                       delivery.origin === 'REMOTE_LINK' ? <Badge variant="outline" className="flex items-center gap-1 w-fit"><Smartphone className="w-3 h-3" /> Link</Badge> : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {delivery.status === 'PENDING' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedDelivery(delivery); setIsSigningModalOpen(true); }} title="Assinar no Tablet">
                              <HandMetal className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => copyRemoteLink(delivery)} title="Copiar Link Remoto">
                              <LinkIcon className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => sendWhatsApp(delivery)} title="Enviar por WhatsApp">
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => sendEmail(delivery)} title="Enviar por E-mail">
                              <MailIcon className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" title="Ver Detalhes">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal: Criar Entrega */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Entrega de Material</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Funcionário Receptor</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Adicionar Itens</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar produto..." 
                  className="pl-8" 
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
                
                {itemSearch && (
                  <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                    <CardContent className="p-0">
                      {products.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase())).map(p => (
                        <div 
                          key={p.id} 
                          className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                          onClick={() => addItem(p)}
                        >
                          <span>{p.name}</span>
                          <span className="text-xs text-muted-foreground">Estoque: {p.currentStock}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-24">Qtd</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground text-sm">Nenhum item adicionado.</TableCell>
                    </TableRow>
                  ) : (
                    items.map(item => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <TableRow key={item.productId}>
                          <TableCell>{product?.name}</TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={item.quantity} 
                              onChange={(e) => setItems(items.map(i => i.productId === item.productId ? { ...i, quantity: parseInt(e.target.value) || 0 } : i))}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeItem(item.productId)}>
                              <XCircle className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button className="bg-seguranca-red hover:bg-seguranca-darkred" onClick={handleCreateDelivery}>Gerar Entrega & Token</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Assinatura no Tablet */}
      <Dialog open={isSigningModalOpen} onOpenChange={setIsSigningModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assinatura Digital (Modo Tablet)</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Funcionário: <strong>{selectedDelivery?.employee?.name}</strong>
            </p>
            <SignaturePad onSave={handleSignTablet} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
