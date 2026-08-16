export function getIsoWeekParts(date: Date): { week: number; year: number } {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { week, year: utcDate.getUTCFullYear() };
}

export function deriveWeeknoteMetadata(date: Date): {
  title: string;
  slug: string;
} {
  const { week, year } = getIsoWeekParts(date);
  return {
    title: `Weeknotes: Week #${week} (${year})`,
    slug: `week-${week}-${year}`,
  };
}
