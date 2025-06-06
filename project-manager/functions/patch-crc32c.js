const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules', '@google-cloud', 'storage', 'build', 'cjs', 'src', 'crc32c.d.ts');

if (fs.existsSync(filePath)) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }

    const result = data.replace(/Int32Array<ArrayBuffer>/g, 'Int32Array');

    fs.writeFile(filePath, result, 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        return;
      }
      console.log('Successfully patched crc32c.d.ts');
    });
  });
} else {
    console.log('crc32c.d.ts not found, skipping patch.');
} 