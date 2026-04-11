export function getCoverUrl(collection: 'projects' | 'lab', data: any): string | null {
  if (!data.cover) return null;
  if (data.cover.startsWith('/') || data.cover.startsWith('http')) {
    return data.cover;
  }
  if (data.folder) {
    return `/assets/images/${collection}/${data.folder}/${data.cover}`;
  }
  // Fallback to old path structure if no folder is provided but we assume there might be an ID
  return `/assets/images/${collection}/${data.cover}`;
}
