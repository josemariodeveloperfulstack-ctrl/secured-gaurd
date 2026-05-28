import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import emailCampaignService, { type EmailMarketingImportedListSummary } from '@/services/emailCampaignService';
import ImportedListEditorDialog from '@/components/comercial-marketing/ImportedListEditorDialog';
import { formatDate } from '@/utils/formatters';
import { ClipboardList, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

const SOURCE_LABELS: Record<string, string> = {
  IMPORT: 'Planilha',
  PASTE: 'Colar lista',
  MIXED: 'Planilha + colar',
};

const ImportedListsTab: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailMarketingImportedListSummary | null>(null);

  const listsQuery = useQuery({
    queryKey: ['email-marketing-imported-lists'],
    queryFn: () => emailCampaignService.listImportedLists(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => emailCampaignService.deleteImportedList(id),
    onSuccess: async () => {
      toast({ title: 'Lista excluída' });
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['email-marketing-imported-lists'] });
    },
    onError: (err: unknown) =>
      toast({
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : 'Não foi possível excluir a lista.',
        variant: 'destructive',
      }),
  });

  const openCreate = () => {
    setEditingId(null);
    setEditorOpen(true);
  };

  const openEdit = (row: EmailMarketingImportedListSummary) => {
    setEditingId(row.id);
    setEditorOpen(true);
  };

  const rows = listsQuery.data ?? [];

  return (
    <>
      <Card className="border-seguranca-graphite bg-seguranca-graphite/40">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <ClipboardList className="h-5 w-5 text-seguranca-yellow" />
              Listas importadas
            </CardTitle>
            <CardDescription className="text-seguranca-lightgray">
              Guarde listas de contatos importadas por planilha ou colagem para reutilizar em campanhas.
            </CardDescription>
          </div>
          <Button
            type="button"
            className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
            onClick={openCreate}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova lista
          </Button>
        </CardHeader>
        <CardContent>
          {listsQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
            </div>
          ) : listsQuery.isError ? (
            <p className="text-sm text-red-400">Não foi possível carregar as listas.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-seguranca-graphite">
              <Table>
                <TableHeader>
                  <TableRow className="border-seguranca-graphite hover:bg-transparent">
                    <TableHead className="text-seguranca-lightgray">Nome</TableHead>
                    <TableHead className="text-seguranca-lightgray">Origem</TableHead>
                    <TableHead className="text-seguranca-lightgray">Contatos</TableHead>
                    <TableHead className="text-seguranca-lightgray">Atualizada</TableHead>
                    <TableHead className="text-right text-seguranca-lightgray">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-seguranca-lightgray">
                        Nenhuma lista guardada. Clique em &quot;Nova lista&quot; para importar ou colar contatos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id} className="border-seguranca-graphite hover:bg-seguranca-black/30">
                        <TableCell className="font-medium text-white">
                          <div>{row.name}</div>
                          {row.description && (
                            <div className="mt-0.5 max-w-md truncate text-xs text-seguranca-lightgray">
                              {row.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-seguranca-lightgray">
                          {SOURCE_LABELS[row.sourceType] ?? row.sourceType}
                        </TableCell>
                        <TableCell className="text-sm text-white">
                          {row.recipientCount.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-xs text-seguranca-lightgray">
                          {formatDate(row.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-seguranca-lightgray hover:text-seguranca-yellow"
                              onClick={() => openEdit(row)}
                            >
                              <Pencil className="mr-1 h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-seguranca-lightgray hover:text-red-400"
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ImportedListEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        listId={editingId}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: ['email-marketing-imported-lists'] })}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-seguranca-graphite bg-seguranca-graphite text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lista?</AlertDialogTitle>
            <AlertDialogDescription className="text-seguranca-lightgray">
              A lista &quot;{deleteTarget?.name}&quot; será removida permanentemente. Os contatos no CRM não são
              apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-transparent text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'A excluir…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ImportedListsTab;
