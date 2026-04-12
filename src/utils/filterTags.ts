const INTERNAL_TAGS = ['project-main', 'landing', 'project-feature'];

export function filterTags(tags: any[] | undefined): string[] {
  if (!tags) return [];
  return tags.filter(tag => typeof tag === 'string' && !INTERNAL_TAGS.includes(tag));
}
