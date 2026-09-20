const fs = require('fs');
const lines = fs.readFileSync('client/src/App.jsx', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('<button') && !l.includes('onClick') && !l.includes('submit')) {
    console.log(`Line ${i+1}: ${l.trim()}`);
  }
});
