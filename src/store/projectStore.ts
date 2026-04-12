import { atom } from 'nanostores';

export const activeProjectId = atom<string | null>(null);
export const activeAnimationId = atom<string | null>(null);
