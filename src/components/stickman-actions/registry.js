import { useVarifocalAction } from './useVarifocalAction.jsx';
import { useMarioKartAction } from './useMarioKartAction.jsx';
import { useIdleAction } from './useIdleAction.jsx';

export const getActiveAction = (projectId, phase) => {
  if (projectId === '2023-08-01-bsv') {
    return useVarifocalAction(phase);
  }
  if (projectId === '2019-03-01-mario') {
    return useMarioKartAction(phase);
  }
  return useIdleAction(phase);
};
