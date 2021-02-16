const Parser = require('./Parser');
const fs = require('fs');

const src = fs.readFileSync('./code.xs', 'utf8');

const parser = new Parser(src);

let tree;
tree = parser.Script();
console.log(JSON.stringify(tree, null, 4));

fs.writeFileSync('./tree.json', JSON.stringify(tree, null, 4), 'utf8');