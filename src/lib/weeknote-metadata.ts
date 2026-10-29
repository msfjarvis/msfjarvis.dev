export interface IsoWeekParts {
  week: number;
  year: number;
}

export interface WeeknoteMetadata {
  title: string;
  slug: string;
}

export function getIsoWeekParts(date: Date): IsoWeekParts {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return { week, year: utcDate.getUTCFullYear() };
}

export function deriveWeeknoteMetadata(date: Date): WeeknoteMetadata {
  const { week, year } = getIsoWeekParts(date);

  return {
    title: `Weeknotes: Week #${week} (${year})`,
    slug: `week-${week}-${year}`,
  };
}
