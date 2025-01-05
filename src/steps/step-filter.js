exports.run = (files, index) => {
  const filtered = [];
  const cleanup = [];

  const duplicates = findDuplicates(files);

  files.forEach(f => {
    if (f.isAppleLivePhoto() || !!duplicates[f.path]) {
      index.db.prepare('UPDATE files SET processed = 0 WHERE path = ?').run(f.path);
      cleanup.push(f);
    } else {
      filtered.push(f);
    }
  });

  return {
    cleanup,
    files: filtered,
    duplicates,
  };
}

function findDuplicates(files) {
  const duplicates = {};

  // Map files with same size.
  const fileMap = {};
  files.forEach(file => {
    if (!fileMap[file.size]) {
      fileMap[file.size] = [];
    }
    fileMap[file.size].push(file);
  });

  // Compare files to each other... if one's name is in the other, with same extension and same modify time, then that other file is most likely a copy.
  Object.keys(fileMap).forEach(key => {
    const files = fileMap[key];

    if (files.length < 2) { return; }

    files.sort((a, b) => a.pathNoExtension.localeCompare(b.pathNoExtension));

    const copies = {};

    for (let i = 0; i < files.length; i++ ) {
      const file = files[i];

      for (let j = i + 1; j < files.length; j++) {
        const otherfile = files[j];
        
        if (otherfile.pathNoExtension.includes(file.pathNoExtension) && file.extension === otherfile.extension && file.date === otherfile.date) {
          if (!copies[file.path]) {
            copies[file.path] = []
          }
          copies[file.path].push(otherfile);

          i = j;
        }
      }
    }
    

    Object.keys(copies).forEach(key => {
      copies[key].forEach(copy => {
        duplicates[copy.path] = true;
      });
    });
  });

  return duplicates;
}