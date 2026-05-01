export function normalizeBlogEntryForSave(entry) {
  const data = structuredClone(entry.data ?? {});
  // Ensure deleted is explicitly boolean, not undefined
  if (!data.deleted) {
    data.deleted = false;
  }
  return { ...entry, data };
}

export function registerTombstoneHook(CMS) {
  if (!CMS || typeof CMS.registerEventListener !== 'function') {
    return;
  }
  CMS.registerEventListener({
    name: 'preSave',
    handler: ({ entry }) => {
      const plain = entry.toJS();
      const normalized = normalizeBlogEntryForSave({
        collection: plain.collection,
        data: plain.data,
      });
      return entry.set('data', entry.get('data').clear().merge(normalized.data));
    },
  });
}
