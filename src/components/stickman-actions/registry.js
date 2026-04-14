import { useVarifocalAction } from './useVarifocalAction.jsx';
import { useMarioKartAction } from './useMarioKartAction.jsx';
import { useRetinaAction } from './useRetinaAction.jsx';
import { usePetsAction } from './usePetsAction.jsx';
import { useIdleAction } from './useIdleAction.jsx';

export const getActiveAction = (animationId, phase) => {
  if (animationId === 'varifocal') {
    return useVarifocalAction(phase);
  }
  if (animationId === 'mario-kart') {
    return useMarioKartAction(phase);
  }
  if (animationId === 'retina-resolution') {
    return useRetinaAction(phase);
  }
  if (animationId === 'secret-pets') {
    return usePetsAction(phase);
  }
  return useIdleAction(phase);
};
