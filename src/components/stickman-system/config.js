export const STICKMAN_DEFAULT_STYLE = {
  headStyle: 'classic',
  bodyStyle: 'classic',
  limbStyle: 'classic',
};

export const STICKMAN_DEFAULT_SHAPE = {
  headSize: 118,
  bodySize: 102,
  headWidth: 38,
  headHeight: 38,
  torsoWidth: 32,
  torsoHeight: 52,
  armLength: 56,
  legLength: 44,
  torsoLean: 0,
  armSpread: 12,
  stanceWidth: 10,
  kneeSoftness: 0,
};

export const STICKMAN_RIG_DEFINITION = {
  layout: {
    centerX: 180,
    groundY: 224,
    perspective: 0.26,
  },
  styles: STICKMAN_DEFAULT_STYLE,
  attachmentSlots: ['head', 'face', 'back', 'leftHand', 'rightHand', 'torsoFront', 'seat'],
};

export const STICKMAN_PHASE_OPTIONS = [
  {
    id: 'standing',
    label: 'Standing',
    title: 'Phase 1: Standing',
    description: 'Lock the silhouette, facing logic, and base rig before any looping motion.',
    allowedClips: ['standing'],
    allowsProps: false,
    status: 'implemented',
  },
  {
    id: 'idle',
    label: 'Idle',
    title: 'Phase 2: Idle',
    description: 'Add breath and posture response, then prove smooth stand-to-idle transitions.',
    allowedClips: ['standing', 'idle'],
    allowsProps: false,
    status: 'implemented',
  },
  {
    id: 'walking',
    label: 'Walking',
    title: 'Phase 3: Walking',
    description: 'Tune the walk loop and clip blending before any prop-specific staging.',
    allowedClips: ['standing', 'idle', 'walk'],
    allowsProps: false,
    status: 'implemented',
  },
  {
    id: 'props',
    label: 'Props',
    title: 'Phase 4: Props',
    description: 'Validate hats, headsets, and hand props on the same rig and controller.',
    allowedClips: ['standing', 'idle', 'walk'],
    allowsProps: true,
    status: 'implemented',
  },
  {
    id: 'complex',
    label: 'Complex',
    title: 'Phase 5: Staged Actions',
    description: 'Vehicles, seated poses, and bespoke scenes will land here after the prop phase is stable.',
    allowedClips: ['standing', 'idle', 'walk'],
    allowsProps: true,
    status: 'planned',
  },
];

export const STICKMAN_CLIP_OPTIONS = [
  {
    id: 'standing',
    label: 'Standing',
    description: 'A neutral base pose used to validate facings and transition landings.',
  },
  {
    id: 'idle',
    label: 'Idle',
    description: 'A planted breathing loop that keeps the current character read intact.',
  },
  {
    id: 'walk',
    label: 'Walking',
    description: 'A compact in-place walk loop that supports front, quarter, and side checks.',
  },
];

export const STICKMAN_FACING_OPTIONS = [
  { id: 'front', label: 'Front', yaw: 0 },
  { id: 'quarter', label: 'Quarter', yaw: 34 },
  { id: 'right', label: 'Right', yaw: -90 },
  { id: 'back', label: 'Back', yaw: 180 },
  { id: 'left', label: 'Left', yaw: 90 },
];

export const STICKMAN_PROP_OPTIONS = [
  {
    id: 'none',
    label: 'None',
    description: 'Keep the base character clean while validating the clip transition system.',
  },
  {
    id: 'vr-headset',
    label: 'VR Headset',
    description: 'The current solid visor block used to validate face-mounted prop stability in motion.',
  },
  {
    id: 'vr-headset-wire-dark',
    label: 'VR Wire Dark',
    description: 'The same visor block with a dark outline and a white fill for a wireframe read.',
  },
  {
    id: 'vr-headset-wire-light',
    label: 'VR Wire Light',
    description: 'An inverted wireframe version with a white outline and a black fill.',
  },
  {
    id: 'vr-headset-boba',
    label: 'Boba Headset',
    description: 'A wider rounded headset inspired by the Boba project silhouette, including the nose cut.',
  },
  {
    id: 'racing-cap',
    label: 'Racing Cap',
    description: 'A simple hat attachment for the head slot and silhouette stress testing.',
  },
  {
    id: 'hand-controller',
    label: 'Hand Controller',
    description: 'A right-hand prop that validates carried items without changing the clip system.',
  },
];

export const STICKMAN_HEADSET_PROP_IDS = [
  'vr-headset',
  'vr-headset-wire-dark',
  'vr-headset-wire-light',
  'vr-headset-boba',
];

export const STICKMAN_INITIAL_STATE = {
  phaseId: 'standing',
  clipId: 'standing',
  facingId: 'quarter',
  propId: 'none',
  tempo: 1,
  intensity: 1,
  transitionSoftness: 1,
};
