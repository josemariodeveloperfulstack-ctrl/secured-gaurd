import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Megaphone, Mail, MessageCircle, Users, LucideIcon } from 'lucide-react';

export interface MarketingKpi {
  label: string;
  value: number | string;
  Icon: LucideIcon;
  accent?: string;
}

export interface MarketingFeature {
  Icon: LucideIcon;
  title: string;
  description: string;
  cta?: string;
  onClick?: () => void;
  badge?: string;
}

interface MarketingHeroProps {
  kpis: MarketingKpi[];
  features: MarketingFeature[];
}

export const MarketingHero: React.FC<MarketingHeroProps> = ({ kpis, features }) => {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-seguranca-yellow/20 bg-gradient-to-br from-seguranca-yellow/15 via-seguranca-graphite/40 to-seguranca-black p-6 shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-seguranca-yellow/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-seguranca-yellow/15 p-3 ring-1 ring-seguranca-yellow/40">
              <Megaphone className="h-8 w-8 text-seguranca-yellow" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Email Marketing &amp; Automação</h1>
              <p className="mt-0.5 text-sm text-seguranca-lightgray">
                Campanhas, templates e fluxos automatizados para o seu time comercial.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map(({ label, value, Icon, accent }) => (
            <div
              key={label}
              className="rounded-xl border border-white/5 bg-black/40 p-4 backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-seguranca-lightgray">{label}</span>
                <Icon className={`h-4 w-4 ${accent ?? 'text-seguranca-yellow'}`} aria-hidden />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map(({ Icon, title, description, cta, onClick, badge }) => (
          <Card
            key={title}
            className="group relative cursor-pointer border-seguranca-graphite bg-seguranca-graphite/40 transition-all hover:-translate-y-0.5 hover:border-seguranca-yellow/40 hover:shadow-lg"
            onClick={onClick}
          >
            {badge && (
              <span className="absolute right-3 top-3 rounded-full bg-seguranca-yellow/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-seguranca-yellow">
                {badge}
              </span>
            )}
            <CardContent className="pt-6">
              <div className="mb-3 inline-flex items-center justify-center rounded-lg bg-seguranca-yellow/10 p-2.5 ring-1 ring-seguranca-yellow/30 group-hover:bg-seguranca-yellow/20">
                <Icon className="h-5 w-5 text-seguranca-yellow" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-seguranca-lightgray">{description}</p>
              {cta && (
                <p className="mt-3 text-xs font-medium text-seguranca-yellow group-hover:underline">
                  {cta} &rarr;
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Re-exporta ícones comuns usados pelos consumidores para evitar imports duplicados.
export const MarketingIcons = { Mail, MessageCircle, Users };
