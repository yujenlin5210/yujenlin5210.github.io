import React from 'react';
import { motion } from 'framer-motion';

export function useIdleAction(phase) {
  return {
    id: 'idle',
    config: {
      isWalking: true,
      isBobbing: true,
      showHeadset: false,
      phases: []
    },
    getLimbs: () => null,
    renderHeadAssets: () => null,
    renderAssets: () => null,
    renderBackAssets: () => null
  };
}
