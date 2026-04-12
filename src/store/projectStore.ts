import { atom } from 'nanostores';

export const activeProjectId = atom<string | null>(null);
