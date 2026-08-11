// Run with: node fix-bvb.js
// Adds missing BB/SB/Stack depth section to bvb chapter in EN, DE, FR

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'chapters.json');
const raw = fs.readFileSync(file, 'utf8');
const data = JSON.parse(raw);

const bvb = data.chapters.bvb;

// The section to append (same content as the IT version, translated)
const tailEN = `<ul><li><strong>BB:</strong><ul><li>Defend wide preflop, especially with ante.</li><li>Check frequently postflop to control the pot.</li><li>Bet selectively with strong hands and strong draws.</li><li>Avoid passive check-calling with marginal hands.</li></ul></li><li><strong>SB:</strong><ul><li>Exploit position by betting frequently.</li><li>Build value with strong hands.</li><li>Bluff on dry boards where BB's range is weak.</li><li>Check back with marginal hands that want to realize equity.</li></ul></li><li><strong>Stack depth:</strong><ul><li>Deep: more speculative hands, more multi-street plays.</li><li>Mid: top pair good kicker becomes very strong, more aggressive lines.</li><li>Short: push/fold preflop, greatly simplified postflop.</li></ul></li></ul><p>The BVB pot is a microcosm of your overall game: if you master it, your MTT winrate will benefit enormously.</p>`;

const tailDE = `<ul><li><strong>BB:</strong><ul><li>Verteidige breit preflop, besonders mit Ante.</li><li>Checke h\u00e4ufig postflop, um den Pot zu kontrollieren.</li><li>Bette selektiv mit starken H\u00e4nden und starken Draws.</li><li>Vermeide passives Check-Callen mit marginalen H\u00e4nden.</li></ul></li><li><strong>SB:</strong><ul><li>Nutze die Position, um h\u00e4ufig zu betten.</li><li>Baue Value mit starken H\u00e4nden auf.</li><li>Bluffe auf trockenen Boards, wo die BB-Range schwach ist.</li><li>Checke zur\u00fcck mit marginalen H\u00e4nden, die Equity realisieren wollen.</li></ul></li><li><strong>Stack depth:</strong><ul><li>Deep: mehr spekulative H\u00e4nde, mehr Multi-Street-Spielz\u00fcge.</li><li>Mid: Top Pair guter Kicker wird sehr stark, aggressivere Linien.</li><li>Short: Push/Fold preflop, stark vereinfachtes Postflop.</li></ul></li></ul><p>Der BVB-Pot ist ein Mikrokosmos deines gesamten Spiels: Wenn du ihn meisterst, profitiert deine MTT-Winrate enorm.</p>`;

const tailFR = `<ul><li><strong>BB :</strong><ul><li>D\u00e9fends large preflop, surtout avec ante.</li><li>Check fr\u00e9quemment postflop pour contr\u00f4ler le pot.</li><li>Mise s\u00e9lectivement avec des mains fortes et des draws forts.</li><li>\u00c9vite le check-call passif avec des mains marginales.</li></ul></li><li><strong>SB :</strong><ul><li>Exploite la position en misant fr\u00e9quemment.</li><li>Construis de la value avec des mains fortes.</li><li>Bluffe sur les boards secs o\u00f9 le range de BB est faible.</li><li>Check back avec des mains marginales qui veulent r\u00e9aliser leur \u00e9quit\u00e9.</li></ul></li><li><strong>Stack depth :</strong><ul><li>Deep : plus de mains sp\u00e9culatives, plus de jeux multi-street.</li><li>Mid : top paire bon kicker devient tr\u00e8s forte, lignes plus agressives.</li><li>Short : push/fold preflop, postflop tr\u00e8s simplifi\u00e9.</li></ul></li></ul><p>Le pot BVB est un microcosme de ton jeu global : si tu le ma\u00eetrises, ta winrate en MTT en b\u00e9n\u00e9ficiera \u00e9norm\u00e9ment.</p>`;

// Check if already patched (avoid double-appending)
if (bvb.body_en && bvb.body_en.includes('BVB pot is a microcosm')) {
  console.log('EN already has the full content. Skipping.');
} else if (bvb.body_en) {
  bvb.body_en = bvb.body_en.trimEnd() + tailEN;
  console.log('✅ EN patched');
} else {
  console.log('⚠️  body_en not found in bvb chapter');
}

if (bvb.body_de && bvb.body_de.includes('BVB-Pot ist ein Mikrokosmos')) {
  console.log('DE already has the full content. Skipping.');
} else if (bvb.body_de) {
  bvb.body_de = bvb.body_de.trimEnd() + tailDE;
  console.log('✅ DE patched');
} else {
  console.log('⚠️  body_de not found in bvb chapter');
}

if (bvb.body_fr && bvb.body_fr.includes('pot BVB est un microcosme')) {
  console.log('FR already has the full content. Skipping.');
} else if (bvb.body_fr) {
  bvb.body_fr = bvb.body_fr.trimEnd() + tailFR;
  console.log('✅ FR patched');
} else {
  console.log('⚠️  body_fr not found in bvb chapter');
}

// Write back with same formatting
fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
console.log('\n📁 chapters.json saved successfully!');
