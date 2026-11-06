const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'public', 'assets', 'inf');

test('sve infrastrukturne i ugaone ilustracije postoje', () => {
  const files = [
    'elektroprivreda.svg', 'vodovod.svg', 'toplana.svg', 'elektrodistribucija.svg',
    'kreni.png', 'zatvor.png', 'parking.png', 'izlaz.png'
  ];
  for (const file of files) assert.equal(fs.existsSync(path.join(root, file)), true, `Nedostaje ${file}`);
});

test('SVG ikone infrastrukture imaju ispravan osnovni SVG korijen', () => {
  for (const file of ['elektroprivreda.svg', 'vodovod.svg', 'toplana.svg', 'elektrodistribucija.svg']) {
    const svg = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(svg, /^<svg\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /<\/svg>\s*$/);
  }
});
