import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StandardLayout } from '@/components/StandardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarketingHero, type MarketingFeature, type MarketingKpi } from '@/components/comercial-marketing/MarketingHero';
import CampaignsTab from '@/components/comercial-marketing/CampaignsTab';
import EmailTemplatesTab from '@/components/comercial-marketing/EmailTemplatesTab';
import ComingSoonTab from '@/components/comercial-marketing/ComingSoonTab';
import emailCampaignService from '@/services/emailCampaignService';
import emailTemplateService from '@/services/emailTemplateService';
import {
  Mail,
  MessageCircle,
  Users,
  Send,
  FileText,
  Bot,
  Megaphone,
} from 'lucide-react';

type TabId = 'campaigns' | 'email-templates' | 'whatsapp-templates' | 'alfred' | 'leads';

const ComercialMarketing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('campaigns');

  const campaignsQuery = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => emailCampaignService.list(),
  });

  const templatesQuery = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplateService.list(false),
  });

  const campaignCount = campaignsQuery.data?.length ?? 0;
  const templateCount = templatesQuery.data?.length ?? 0;
  const totalRecipients =
    campaignsQuery.data?.reduce((acc, c) => acc + (c.recipientCount ?? 0), 0) ?? 0;

  const kpis: MarketingKpi[] = [
    { label: 'Campanhas', value: campaignCount, Icon: Megaphone },
    { label: 'Templates E-mail', value: templateCount, Icon: Mail },
    { label: 'Templates WhatsApp', value: 0, Icon: MessageCircle, accent: 'text-emerald-400' },
    { label: 'Destinatários totais', value: totalRecipients, Icon: Send },
  ];

  const features: MarketingFeature[] = [
    {
      Icon: Mail,
      title: 'Templates de e-mail',
      description:
        'Modelos reutilizáveis com variáveis dinâmicas como nome, empresa e cargo — preview em tempo real.',
      cta: 'Gerenciar templates',
      onClick: () => setActiveTab('email-templates'),
    },
    {
      Icon: MessageCircle,
      title: 'Templates de WhatsApp',
      description:
        'Mensagens rápidas para reaproveitar nos disparos automatizados após contato por e-mail.',
      cta: 'Em breve',
      badge: 'Em breve',
      onClick: () => setActiveTab('whatsapp-templates'),
    },
    {
      Icon: Users,
      title: 'Lista de leads',
      description:
        'Importe contatos em CSV/Excel ou utilize a base de leads do CRM para alimentar campanhas.',
      cta: 'Ver leads',
      onClick: () => setActiveTab('leads'),
    },
  ];

  return (
    <StandardLayout>
      <div className="space-y-6">
        <MarketingHero kpis={kpis} features={features} />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="space-y-5">
          <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-seguranca-graphite/60 p-1">
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black">
              <Megaphone className="mr-2 h-4 w-4" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger
              value="email-templates"
              className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black"
            >
              <Mail className="mr-2 h-4 w-4" />
              Templates E-mail
            </TabsTrigger>
            <TabsTrigger
              value="whatsapp-templates"
              className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Templates WhatsApp
            </TabsTrigger>
            <TabsTrigger
              value="alfred"
              className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black"
            >
              <Bot className="mr-2 h-4 w-4" />
              Status do Alfred
            </TabsTrigger>
            <TabsTrigger
              value="leads"
              className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black"
            >
              <Users className="mr-2 h-4 w-4" />
              Lista de Leads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-0">
            <CampaignsTab />
          </TabsContent>

          <TabsContent value="email-templates" className="mt-0">
            <EmailTemplatesTab />
          </TabsContent>

          <TabsContent value="whatsapp-templates" className="mt-0">
            <ComingSoonTab
              Icon={MessageCircle}
              title="Templates de WhatsApp"
              description="Modelos de mensagens para reaproveitar nos disparos automatizados de WhatsApp Business."
              bullets={[
                'Cadastro de modelos com variáveis dinâmicas (mesmo motor dos e-mails).',
                'Disparo via WhatsApp Business (integração já preparada via WhatsAppService).',
                'Sincronização opcional de templates aprovados.',
              ]}
            />
          </TabsContent>

          <TabsContent value="alfred" className="mt-0">
            <ComingSoonTab
              Icon={Bot}
              title="Status do Alfred (agente de automação)"
              description="Orquestrador que envia o e-mail, observa abertura/clique e dispara um follow-up por WhatsApp quando necessário."
              bullets={[
                'Fluxo encadeado: e-mail → aguardar leitura → WhatsApp condicional.',
                'Throttling configurável (ex.: 10 envios/dia).',
                'Painel com fila, próximos envios e taxa de resposta.',
              ]}
            />
          </TabsContent>

          <TabsContent value="leads" className="mt-0">
            <ComingSoonTab
              Icon={FileText}
              title="Lista de leads para campanhas"
              description="Importe contatos por CSV/Excel ou puxe diretamente da base de leads do CRM, marcando quem entra em cada campanha."
              bullets={[
                'Upload de planilha com mapeamento de colunas para variáveis.',
                'Filtrar leads existentes por origem, status, segmento.',
                'Marcar destinatários como descadastrados (unsubscribe) automaticamente.',
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </StandardLayout>
  );
};

export default ComercialMarketing;
