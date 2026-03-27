export function normalizeBlogEntryForSave(entry) {
  const data = structuredClone(entry.data ?? {});

  if (!data.deleted) {
    if (data.build) {
      delete data.build.publishResources;
      delete data.build.render;
      if (Object.keys(data.build).length === 0) {
        delete data.build;
      }
    }
    if (data.sitemap?.disable === true) {
      delete data.sitemap.disable;
      if (Object.keys(data.sitemap).length === 0) {
        delete data.sitemap;
      }
    }

    return { ...entry, data };
  }

  data.build = {
    ...(data.build ?? {}),
    publishResources: false,
    render: 'never',
  };
  data.sitemap = {
    ...(data.sitemap ?? {}),
    disable: true,
  };

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
