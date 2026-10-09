export interface FileRevision {
  path: string;
  revision: string;
}

export interface ChangedFile<T extends FileRevision> {
  entry: T;
  change: "added" | "updated";
}

export function findChangedFiles<T extends FileRevision>(
  previous: readonly FileRevision[],
  next: readonly T[],
): ChangedFile<T>[] {
  const previousByPath = new Map(
    previous.map(({ path, revision }) => [path, revision]),
  );
  const nextByPath = new Map(next.map((entry) => [entry.path, entry]));
  return [...nextByPath.values()].flatMap((entry) => {
    const previousRevision = previousByPath.get(entry.path);
    if (previousRevision === entry.revision) return [];
    return [
      {
        entry,
        change: previousByPath.has(entry.path) ? "updated" : "added",
      },
    ];
  });
}
