import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FileText, Clock, MessageSquare, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const MobileNavbar: React.FC = () => {
    const { user } = useAuth();

    if (!user) return null;

    // Só exibir para Colaborador ou se necessário para outros papéis mobile futuramente
    const isCollaborator = user.role?.includes('COLABORADOR');

    if (!isCollaborator) return null;

    const navItems = [
        { icon: Home, label: 'Início', to: '/area-funcionario' },
        { icon: FileText, label: 'Documentos', to: '/area-funcionario' }, // Pode manter para facilitar, mas o portal centraliza
        { icon: Clock, label: 'Ponto', to: '/meu-ponto' },
        { icon: MessageSquare, label: 'Mensagens', to: '/mensagens' },
        { icon: User, label: 'Perfil', to: '/profile' },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-seguranca-black/95 backdrop-blur-lg border-t border-gray-800 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `
              flex flex-col items-center justify-center gap-1 transition-all duration-300
              ${isActive ? 'text-seguranca-yellow scale-110' : 'text-gray-500'}
            `}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
                            {item.label}
                        </span>
                        {/* Indicador ativo */}
                        <div className="h-1 w-1 rounded-full mt-0.5 opacity-0 transition-opacity aria-[current=page]:opacity-100 bg-seguranca-yellow" />
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};
