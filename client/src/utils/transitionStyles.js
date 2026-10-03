// Motion Variants Generator for all 20 Screen Transitions
export function getTransitionVariants(styleId, direction = 1) {
  switch (styleId) {
    case 'ios-parallax':
      return {
        initial: { x: direction > 0 ? 40 : -40, scale: 0.98, opacity: 0 },
        animate: { x: 0, scale: 1, opacity: 1, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } },
        exit: { x: direction > 0 ? -24 : 24, scale: 0.98, opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } }
      };

    case 'circular-reveal':
      return {
        initial: { clipPath: 'circle(0% at 50% 40%)', scale: 0.96, opacity: 0 },
        animate: { clipPath: 'circle(150% at 50% 40%)', scale: 1, opacity: 1, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
        exit: { clipPath: 'circle(0% at 50% 40%)', scale: 0.96, opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } }
      };

    case 'zoom-bloom':
      return {
        initial: { scale: 0.92, opacity: 0, filter: 'blur(4px)' },
        animate: { scale: 1, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
        exit: { scale: 1.04, opacity: 0, filter: 'blur(2px)', transition: { duration: 0.12, ease: 'easeIn' } }
      };

    case 'fade-scale':
      return {
        initial: { scale: 0.97, opacity: 0 },
        animate: { scale: 1, opacity: 1, transition: { duration: 0.15, ease: 'easeOut' } },
        exit: { scale: 0.98, opacity: 0, transition: { duration: 0.1, ease: 'easeIn' } }
      };

    case 'sheet-lift':
      return {
        initial: { y: 40, opacity: 0, borderRadius: '20px' },
        animate: { y: 0, opacity: 1, borderRadius: '0px', transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
        exit: { y: -20, opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } }
      };

    case 'horizontal-slide':
      return {
        initial: { x: direction > 0 ? '60%' : '-60%', opacity: 0.6 },
        animate: { x: 0, opacity: 1, transition: { duration: 0.18, ease: [0.25, 1, 0.5, 1] } },
        exit: { x: direction > 0 ? '-30%' : '30%', opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } }
      };

    case 'vertical-elevator':
      return {
        initial: { y: direction > 0 ? 50 : -50, opacity: 0 },
        animate: { y: 0, opacity: 1, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
        exit: { y: direction > 0 ? -30 : 30, opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } }
      };

    case '3d-flip':
      return {
        initial: { rotateY: direction > 0 ? 14 : -14, scale: 0.94, opacity: 0, transformPerspective: 1000 },
        animate: { rotateY: 0, scale: 1, opacity: 1, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
        exit: { rotateY: direction > 0 ? -12 : 12, scale: 0.95, opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } }
      };

    case 'bouncy-pop':
      return {
        initial: { scale: 0.88, opacity: 0 },
        animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 520, damping: 22 } },
        exit: { scale: 0.94, opacity: 0, transition: { duration: 0.1 } }
      };

    case 'blur-dissolve':
      return {
        initial: { filter: 'blur(10px)', opacity: 0, scale: 0.97 },
        animate: { filter: 'blur(0px)', opacity: 1, scale: 1, transition: { duration: 0.18, ease: 'easeOut' } },
        exit: { filter: 'blur(8px)', opacity: 0, scale: 1.01, transition: { duration: 0.12, ease: 'easeIn' } }
      };

    case 'diagonal-sweep':
      return {
        initial: { x: direction > 0 ? 36 : -36, y: -28, opacity: 0, scale: 0.97 },
        animate: { x: 0, y: 0, opacity: 1, scale: 1, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
        exit: { x: direction > 0 ? -28 : 28, y: 20, opacity: 0, transition: { duration: 0.12 } }
      };

    case 'cyber-pulse':
      return {
        initial: { scale: 0.94, opacity: 0, filter: 'brightness(1.4)' },
        animate: { scale: 1, opacity: 1, filter: 'brightness(1)', transition: { duration: 0.15, ease: 'easeOut' } },
        exit: { scale: 0.97, opacity: 0, filter: 'brightness(0.7)', transition: { duration: 0.1 } }
      };

    case 'flip-x':
      return {
        initial: { rotateX: 14, opacity: 0, scale: 0.96, transformPerspective: 1000 },
        animate: { rotateX: 0, opacity: 1, scale: 1, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
        exit: { rotateX: -10, opacity: 0, scale: 0.97, transition: { duration: 0.12 } }
      };

    case 'elastic-squish':
      return {
        initial: { scaleX: 1.08, scaleY: 0.92, opacity: 0 },
        animate: { scaleX: 1, scaleY: 1, opacity: 1, transition: { type: 'spring', stiffness: 520, damping: 18 } },
        exit: { scaleX: 0.94, scaleY: 1.06, opacity: 0, transition: { duration: 0.1 } }
      };

    case 'radial-swirl':
      return {
        initial: { rotate: direction > 0 ? -5 : 5, scale: 0.94, opacity: 0 },
        animate: { rotate: 0, scale: 1, opacity: 1, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
        exit: { rotate: direction > 0 ? 4 : -4, scale: 0.96, opacity: 0, transition: { duration: 0.12 } }
      };

    case 'curtain-drop':
      return {
        initial: { y: -50, opacity: 0, scale: 0.98 },
        animate: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
        exit: { y: 28, opacity: 0, transition: { duration: 0.12 } }
      };

    case 'mirror-depth':
      return {
        initial: { scale: 1.1, opacity: 0, filter: 'blur(4px)' },
        animate: { scale: 1, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
        exit: { scale: 0.92, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.12 } }
      };

    case 'camera-aperture':
      return {
        initial: { clipPath: 'circle(10% at 50% 50%)', opacity: 0 },
        animate: { clipPath: 'circle(120% at 50% 50%)', opacity: 1, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
        exit: { clipPath: 'circle(15% at 50% 50%)', opacity: 0, transition: { duration: 0.12 } }
      };

    case 'zen-minimal':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.1, ease: 'linear' } },
        exit: { opacity: 0, transition: { duration: 0.07, ease: 'linear' } }
      };

    case 'arcade-snap':
      return {
        initial: { scale: 0.88, y: 12, opacity: 0 },
        animate: { scale: 1, y: 0, opacity: 1, transition: { duration: 0.15, ease: [0, 0, 0.2, 1] } },
        exit: { scale: 0.94, y: -8, opacity: 0, transition: { duration: 0.1 } }
      };

    default:
      return {
        initial: { x: 28, opacity: 0 },
        animate: { x: 0, opacity: 1, transition: { duration: 0.16 } },
        exit: { x: -20, opacity: 0, transition: { duration: 0.1 } }
      };
  }
}
