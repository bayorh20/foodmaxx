const fs = require('fs');
const content = fs.readFileSync('client/src/App.jsx', 'utf8');

const regex = /<button[^>]*>/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const tag = match[0];
  if (!tag.includes('onClick') && !tag.includes('type="submit"') && !tag.includes("type='submit'")) {
    // get line number
    const upToMatch = content.slice(0, match.index);
    const lineNum = (upToMatch.match(/\n/g) || []).length + 1;
    console.log(`Line ${lineNum}:`, tag.replace(/\s+/g, ' ').slice(0, 100));
  }
}
