// api/chapter.js - serves the body of a paid chapter only to who actually owns it.
//
// Paid chapter text is NOT in the public chapters.json any more, so reading the
// static files no longer leaks PRO and ELITE content.
const L = require('./_lib');
const CONTENT = require('./content-paid.json');

module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  try {
    const s = await L.session(req);
    if (!s) return res.status(401).json({ error: 'invalid session' });

    // One paying account should not be able to vacuum the whole paid library in
    // seconds: a chapter is read once and cached client side, so a legitimate
    // reader never hits this.
    const burst = await L.db.incrTtl('rl:cap:' + s.uid + ':' + Math.floor(Date.now() / 60000), 90);
    if (burst > 25) return res.status(429).json({ error: 'too many requests' });

    const { id, lang } = L.body(req);
    const chapter = CONTENT.chapters[id];
    if (!chapter) return res.status(404).json({ error: 'unknown chapter' });

    const tier = CONTENT.tiers.pro.includes(id) ? 'pro'
      : CONTENT.tiers.elite.includes(id) ? 'elite' : null;
    if (!tier) return res.status(404).json({ error: 'unknown tier' });
    if (!s.user[tier]) return res.status(403).json({ error: 'not entitled', tier });

    const safeLang = ['it', 'en', 'es', 'fr', 'de'].includes(lang) ? lang : 'en';
    const bodyText = chapter['body_' + safeLang] || chapter.body_en || chapter.body_it;
    const quiz = (CONTENT.quiz && CONTENT.quiz[id]) ? (CONTENT.quiz[id][safeLang] || CONTENT.quiz[id].en) : null;

    return res.status(200).json({ id, lang: safeLang, body: bodyText, quiz: quiz || null });
  } catch (e) {
    console.error('chapter', e);
    return res.status(500).json({ error: 'content unavailable' });
  }
};
