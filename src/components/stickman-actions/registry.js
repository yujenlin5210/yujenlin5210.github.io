import { useVarifocalAction } from './useVarifocalAction.jsx';
import { useMarioKartAction } from './useMarioKartAction.jsx';
import { useRetinaAction } from './useRetinaAction.jsx';
import { usePetsAction } from './usePetsAction.jsx';
import { useBoba3Action } from './useBoba3Action.jsx';
import { useTiramisuAction } from './useTiramisuAction.jsx';
import { useIdleAction } from './useIdleAction.jsx';

/**
 * @typedef {object} StickmanAction
 * @property {string} id
 * @property {Record<string, any>} config
 * @property {() => any} getLimbs
 * @property {(direction?: number) => import('react').ReactNode} renderHeadAssets
 * @property {(direction?: number) => import('react').ReactNode} renderAssets
 * @property {() => import('react').ReactNode} renderBackAssets
 */

const EMPTY_RENDER = () => null;

/**
 * @param {Partial<StickmanAction> & Pick<StickmanAction, 'id' | 'config' | 'getLimbs'>} action
 * @returns {StickmanAction}
 */
function normalizeAction(action) {
  return {
    renderHeadAssets: EMPTY_RENDER,
    renderAssets: EMPTY_RENDER,
    renderBackAssets: EMPTY_RENDER,
    ...action,
  };
}

/** @returns {StickmanAction} */
export const getActiveAction = (animationId, phase) => {
  if (animationId === 'varifocal') {
    return normalizeAction(useVarifocalAction(phase));
  }
  if (animationId === 'mario-kart') {
    return normalizeAction(useMarioKartAction(phase));
  }
  if (animationId === 'retina-resolution') {
    return normalizeAction(useRetinaAction(phase));
  }
  if (animationId === 'secret-pets') {
    return normalizeAction(usePetsAction(phase));
  }
  if (animationId === 'boba3') {
    return normalizeAction(useBoba3Action(phase));
  }
  if (animationId === 'tiramisu') {
    return normalizeAction(useTiramisuAction(phase));
  }
  return normalizeAction(useIdleAction());
};
