// api/chat.js - AI poker GTO coach, metered server side.
//
// The credit is spent HERE, not in the browser. Editing localStorage no longer
// buys questions, and the API key never leaves the server.
const L = require('./_lib');

// Default model. Override with the AI_MODEL env var in Vercel without touching this file.
const DEFAULT_MODEL = 'gpt-5-mini';

// The coach must speak the same language as the guide: same formulas, same
// terminology, same bb thresholds. Otherwise it contradicts the chapters.
const SYSTEM_PROMPT = [
  "You are the AI poker GTO coach inside The Poker Guide, a Texas Hold'em MTT strategy app.",
  'The user is reading a chapter and got stuck. Your job is to make the concept click.',
  '',
  'HOW TO ANSWER',
  '- Answer in the SAME LANGUAGE as the question. Never switch language.',
  '- Lead with the direct answer in one sentence. Then explain why.',
  '- Whenever a number is involved, show the actual calculation with real values,',
  '  not just the abstract formula. Numbers teach, formulas alone do not.',
  '- Use a concrete example with chips or bb when it helps (pot 100, bet 50, 25 bb, and so on).',
  '- Talk like an experienced player explaining to a friend: direct, confident, no filler,',
  '  no bullet-point walls, and never say it depends without saying what it depends on.',
  '- Around 120-200 words. Shorter when the question is simple.',
  '- Never invent solver outputs or exact GTO frequencies you cannot derive.',
  '  If something is a heuristic, say so.',
  '',
  'FORMULAS - use exactly these, the whole guide is built on them',
  '- required equity = call / final pot   (final pot includes your call)',
  '- MDF = pot / (pot + bet)',
  '- pure bluff needs fold% = bet / (bet + pot)',
  '- balanced bluff share = bet / (pot + 2 x bet)',
  '- SPR = effective stack / pot on the flop',
  '- implied odds, extra money needed = (call / equity) - final pot',
  '- risk premium = required equity in a tournament - required equity from pot odds',
  '- bubble factor = EV lost if you get stacked / EV gained if you stack him',
  '- symmetric all-in: required equity = BF / (BF + 1)',
  '- PKO bounty in chips = (collectable half / net buy-in) x starting chips',
  '- PKO required equity = call / (final pot + bounty in chips)',
  '- multiway fold equity multiplies: two opponents folding 40% each gives 0.40 x 0.40 = 16%',
  '',
  'TERMINOLOGY - the guide is strict about this',
  '- Blind vs Blind: the Small Blind is OOP, the Big Blind is IP.',
  '- Say iso-raise, never isolation raise. Say resteal, one single term.',
  '- node locking is a solver technique, NOT a synonym for exploitative play.',
  '- bb thresholds: under 15 push/fold, 15-25 short, 30-60 medium, 80-100+ deep.',
  '- Only one definition of bubble factor, the ICM one.',
  '',
  'BOUNDARIES',
  '- Poker strategy only: GTO, ranges, preflop, postflop, pot odds, ICM, PKO, bankroll,',
  '  mental game, study methods. Off-topic questions get a short, friendly redirect.',
  '- Educational product, 18+. Never suggest where to play, never mention poker rooms,',
  '  deposits, bonuses or real-money gambling. No promises of profit.'
].join('\n');

module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  try {
    const s = await L.session(req);
    if (!s) return res.status(401).json({ error: 'invalid session' });

    // history is deliberately NOT read from the request: a forged "assistant" turn
    // was enough to argue the coach out of its own system prompt and turn a paid
    // API key into a general purpose chatbot. The conversation lives server side.
    const { message, lang, chapter } = L.body(req);
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'empty message' });
    }
    if (message.length > 1200) return res.status(400).json({ error: 'message too long' });

    // 1. Abuse throttle, even for a user with plenty of credits
    const limited = await L.rateLimit(s.uid, L.clientIp(req));
    if (limited) return res.status(429).json({ error: limited, credits: s.user.credits });

    // 2 + 3. Charge first, then answer, with a single atomic operation: the old
    // read-modify-write let six parallel requests all spend the same last credit.
    // A failed reply refunds it below.
    const left = await L.spendCredit(s.uid, s.user);
    if (left === null) return res.status(402).json({ error: 'no credits', credits: 0 });

    // Context: which language to reply in and which chapter the user is on.
    const LANGS = { it: 'Italian', en: 'English', es: 'Spanish', de: 'German', fr: 'French' };
    let ctx = '';
    if (LANGS[lang]) ctx += 'Reply in ' + LANGS[lang] + '. ';
    if (typeof chapter === 'string' && /^[a-z0-9_]{1,32}$/.test(chapter)) {
      ctx += 'The user is currently reading the ' + chapter + ' chapter, so keep the answer relevant to it.';
    }

    const msgs = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (ctx) msgs.push({ role: 'system', content: ctx });
    const history = await L.getHistory(s.uid);
    history.forEach((m) => {
      if (m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') {
        msgs.push({ role: m.role, content: m.content.slice(0, 1200) });
      }
    });
    msgs.push({ role: 'user', content: message });

    let reply = '';
    try {
      const ai = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || DEFAULT_MODEL,
          messages: msgs,
          max_completion_tokens: 1100
        })
      });
      if (!ai.ok) throw new Error('ai http ' + ai.status);
      const j = await ai.json();
      reply = j.choices?.[0]?.message?.content || '';
      if (!reply) throw new Error('empty reply');
    } catch (err) {
      // Refund: the user must not pay for our failure
      const back = await L.addCredits(s.uid, 1);
      console.error('ai error', err);
      return res.status(502).json({ error: 'ai unavailable', credits: back });
    }

    // Remember the exchange for the next question, server side only.
    try { await L.pushHistory(s.uid, message, reply); } catch (e) { /* context is best effort */ }

    return res.status(200).json({ reply, credits: left });
  } catch (e) {
    console.error('chat', e);
    return res.status(500).json({ error: 'chat unavailable' });
  }
};
