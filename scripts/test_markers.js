const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../client/src/App.jsx');
let content = fs.readFileSync(appPath, 'utf8');

const startMarker = '// ADMIN PRODUCT MODAL (Add / Edit Dish)';
const endMarker = '// ============================================================\n// AUTH PROVIDER';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

console.log('Markers found:', { startIndex, endIndex });
