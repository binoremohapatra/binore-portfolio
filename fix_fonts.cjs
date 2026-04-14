const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/Home.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Revert all 
content = content.replace(/var\(--font-cyberpunk, 'Orbitron', 'Tektur', sans-serif\)/g, "'Orbitron', sans-serif");

// Selectively apply to the main heading
// The heading has specific styling next to it we can match to uniquely identify it
const targetHeader = `fontFamily: "'Orbitron', sans-serif",
                    fontWeight: 900,
                    fontSize: 'clamp(3rem, 10vw, 9rem)',`;

const replacementHeader = `fontFamily: "var(--font-cyberpunk, 'Orbitron', 'Tektur', sans-serif)",
                    fontWeight: 900,
                    fontSize: 'clamp(3rem, 10vw, 9rem)',`;

content = content.replace(targetHeader, replacementHeader);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fonts fixed!');
