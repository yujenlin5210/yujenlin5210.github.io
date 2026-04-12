import { useVarifocalAction } from './useVarifocalAction.jsx';
import { useMarioKartAction } from './useMarioKartAction.jsx';
import { useIdleAction } from './useIdleAction.jsx';

export const getActiveAction = (animationId, phase) => {
  if (animationId === 'varifocal') {
    return useVarifocalAction(phase);
  }
  if (animationId === 'mario-kart') {
    return useMarioKartAction(phase);
  }
  return useIdleAction(phase);
};
