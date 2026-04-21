export function useIdleAction() {
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
