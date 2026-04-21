const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type DatedEntry = {
  id: string;
  data: {
    date?: string;
  };
};

export function normalizeDateInput(value: string | Date, context = 'date'): string {
  const dateString = value instanceof Date ? value.toISOString().slice(0, 10) : value;

  if (!ISO_DATE_PATTERN.test(dateString)) {
    throw new Error(`${context} must use YYYY-MM-DD.`);
  }

  const normalizedDate = new Date(`${dateString}T00:00:00Z`);
  if (
    Number.isNaN(normalizedDate.getTime()) ||
    normalizedDate.toISOString().slice(0, 10) !== dateString
  ) {
    throw new Error(`${context} is not a valid calendar date: ${dateString}.`);
  }

  return dateString;
}

export function normalizeOptionalDateInput(
  value: string | Date | undefined,
  context = 'date',
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return normalizeDateInput(value, context);
}

export function getEntryDate(entry: DatedEntry): string {
  return (
    normalizeOptionalDateInput(entry.data.date, `frontmatter date for "${entry.id}"`) ??
    normalizeDateInput(entry.id.slice(0, 10), `filename date for "${entry.id}"`)
  );
}

export function getEntryYear(entry: DatedEntry): string {
  return getEntryDate(entry).slice(0, 4);
}

export function compareEntriesByDateDesc(a: DatedEntry, b: DatedEntry): number {
  return getEntryDate(b).localeCompare(getEntryDate(a));
}
