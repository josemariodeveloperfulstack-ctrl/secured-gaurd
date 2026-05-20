import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, Sparkles } from 'lucide-react';

interface Props {
  Icon: LucideIcon;
  title: string;
  description: string;
  bullets?: string[];
}

const ComingSoonTab: React.FC<Props> = ({ Icon, title, description, bullets }) => {
  return (
    <Card className="border-seguranca-graphite bg-seguranca-graphite/30">
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="rounded-full bg-seguranca-yellow/10 p-4 ring-1 ring-seguranca-yellow/30">
          <Icon className="h-8 w-8 text-seguranca-yellow" aria-hidden />
        </div>
        <div className="max-w-md">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-seguranca-yellow/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-seguranca-yellow">
              <Sparkles className="h-3 w-3" /> Em breve
            </span>
          </div>
          <p className="mt-2 text-sm text-seguranca-lightgray">{description}</p>
        </div>
        {bullets && bullets.length > 0 && (
          <ul className="mt-2 space-y-1.5 text-left text-sm text-seguranca-lightgray">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-seguranca-yellow" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default ComingSoonTab;
