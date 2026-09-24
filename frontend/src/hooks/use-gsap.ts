import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registrar plugin ScrollTrigger
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Hook customizado para animações GSAP em páginas públicas
 * Substitui o AOS Animate com uma solução mais robusta
 */
export const useGSAP = () => {
  const elementsRef = useRef<Element[]>([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Evitar inicialização múltipla
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Aguardar o DOM estar pronto
    const timer = setTimeout(() => {
      // Selecionar todos os elementos com data-animate
      const elements = document.querySelectorAll('[data-animate]');

      elementsRef.current = Array.from(elements);

      // Sem elementos: comportamento normal em páginas internas (que não usam
      // animações de entrada). Nada a fazer e nada a avisar no console.
      if (elements.length === 0) {
        return;
      }

      if (import.meta.env.DEV) {
        console.debug(`🎬 GSAP: ${elements.length} elemento(s) com [data-animate] animado(s)`);
      }

      elements.forEach((element) => {
        const animationType = element.getAttribute('data-animate') || 'fadeUp';
        const delay = parseFloat(element.getAttribute('data-delay') || '0');
        const duration = parseFloat(element.getAttribute('data-duration') || '0.8');

        // IMPORTANTE: Garantir que o elemento está visível desde o início
        gsap.set(element, { opacity: 1, visibility: 'visible' });

        // Configurações de animação baseadas no tipo
        let animationConfig: any = {
          duration,
          delay: delay / 1000, // Converter ms para segundos
          ease: 'power2.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 95%', // Inicia quando o elemento está 95% visível (mais cedo)
            toggleActions: 'play none none none',
            once: true,
          },
        };

        // Diferentes tipos de animação
        switch (animationType) {
          case 'fadeUp':
            gsap.from(element, {
              ...animationConfig,
              opacity: 0,
              y: 50,
            });
            break;

          case 'fadeDown':
            gsap.from(element, {
              ...animationConfig,
              opacity: 0,
              y: -50,
            });
            break;

          case 'fadeLeft':
            gsap.from(element, {
              ...animationConfig,
              opacity: 0,
              x: -50,
            });
            break;

          case 'fadeRight':
            gsap.from(element, {
              ...animationConfig,
              opacity: 0,
              x: 50,
            });
            break;

          case 'zoomIn':
            gsap.from(element, {
              ...animationConfig,
              opacity: 0,
              scale: 0.8,
            });
            break;

          case 'zoomOut':
            gsap.from(element, {
              ...animationConfig,
              opacity: 0,
              scale: 1.2,
            });
            break;

          default:
            // Sem animação específica, apenas fade in
            gsap.from(element, {
              ...animationConfig,
              opacity: 0,
            });
        }
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      // Limpar ScrollTriggers ao desmontar
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      hasInitialized.current = false;
    };
  }, []);

  // Retornar função helper para aplicar data-attributes facilmente
  return {
    fadeUp: 'fadeUp',
    fadeDown: 'fadeDown',
    fadeLeft: 'fadeLeft',
    fadeRight: 'fadeRight',
    zoomIn: 'zoomIn',
    zoomOut: 'zoomOut',
  };
};

export default useGSAP;

