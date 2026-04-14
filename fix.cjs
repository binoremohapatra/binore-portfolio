const fs = require('fs');
const file = 'src/components/NeuralMind.jsx';
let content = fs.readFileSync(file, 'utf8');

// The file has literal backslashes escaping the backticks and dollar signs from my last code gen.
content = content.replace(/\\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed syntax errors.');
