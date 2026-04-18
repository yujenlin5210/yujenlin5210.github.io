export function getCoverUrl(collection: 'projects' | 'lab', data: any): string | null {
  if (!data.cover) return null;
  if (data.cover.startsWith('/') || data.cover.startsWith('http')) {
    return data.cover;
  }
  if (data.folder) {
    return `/assets/images/${collection}/${data.folder}/${data.cover}`;
  }
  return `/assets/images/${collection}/${data.cover}`;
}
