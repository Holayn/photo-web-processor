exports.run = (files, index) => {
  const filtered = [];
  const cleanup = [];

  files.forEach(f => {
    if (f.isAppleLivePhoto()) {
      index.db.prepare('UPDATE files SET processed = 0 WHERE path = ?').run(f.path);
      cleanup.push(f);
    } else {
      filtered.push(f);
    }
  });

  return {
    cleanup,
    files: filtered,
  };
}
