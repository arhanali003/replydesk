export function inspectAnswer(text) {
  if (typeof text !== 'string' || text.length > 100000) throw Error('Use an answer shorter than 100,000 characters.');
  const links = [...new Set((text.match(/https?:\/\/[^\s<>"`]+/g) || []).map(s => s.replace(/[.,;!?]+$/, '').replace(/\)+$/, '')))];
  const sentences = text.replace(/```[\s\S]*?```/g, '').split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const candidates = sentences.flatMap(sentence => {
    const reasons = [];
    if (/\b\d+(?:\.\d+)?\s*(?:%|million|billion|percent)\b|\d+%/i.test(sentence)) reasons.push('Numerical claim');
    if (/\b(latest|currently|today|now|as of|20\d{2})\b/i.test(sentence)) reasons.push('Time-sensitive wording');
    if (/\b(study|research|according to|proves?|always|never|first|only)\b/i.test(sentence)) reasons.push('Source or scope needs review');
    return reasons.length ? [{sentence, reasons}] : [];
  });
  return {links, candidates};
}

export function checkableURL(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      !host.includes('.') || /[:\[\]]/.test(host) || /^[\d.]+$/.test(host) ||
      /(^|\.)(localhost|local|internal|lan|test|invalid)$/.test(host)) {
    throw Error('Only public-looking HTTPS hostnames on port 443 are supported.');
  }
  url.hash = '';
  return url;
}

export function httpVerdict(status, type = '') {
  if (type === 'opaqueredirect' || (status >= 300 && status < 400)) return 'Redirect — destination not checked';
  if (status >= 200 && status < 300) return 'Responded — content not verified';
  if (status === 404 || status === 410) return 'Reported missing';
  if (status === 401 || status === 403) return 'Access restricted — not proof of a broken link';
  if (status === 429) return 'Rate limited — retry later';
  if (status === 405 || status === 501) return 'HEAD unsupported — not checked';
  return 'Inconclusive server response';
}

export async function checkURL(raw, fetcher = fetch, timeout = 8000) {
  const url = checkableURL(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetcher(url.href, {method:'HEAD', credentials:'omit', redirect:'manual', cache:'no-store', referrerPolicy:'no-referrer', signal:controller.signal});
    return {url:url.href, status:response.status, verdict:httpVerdict(response.status, response.type), checkedAt:new Date().toISOString()};
  } catch {
    return {url:url.href, status:null, verdict:'Network, timeout or browser restriction — not checked', checkedAt:new Date().toISOString()};
  } finally { clearTimeout(timer); }
}

function count(n, name) {
  if (!Number.isSafeInteger(n) || n < 0 || n > 1e9) throw Error(`${name} must be an integer from 0 to 1,000,000,000.`);
  return BigInt(n);
}
function rate(value) {
  if (typeof value !== 'string' || !/^\d{1,6}(\.\d{1,6})?$/.test(value)) throw Error('Prices must be nonnegative decimal strings with up to six decimal places.');
  const [whole, fraction=''] = value.split('.');
  return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6,'0'));
}
function money(units) {
  return `${units / 1000000000000n}.${(units % 1000000000000n).toString().padStart(12,'0')}`;
}
export function estimateCosts(records, table) {
  if (!Array.isArray(records) || records.length > 10000) throw Error('Provide an array of at most 10,000 usage records.');
  if (!table || table.currency !== 'USD' || typeof table.asOf !== 'string' || !table.models || typeof table.models !== 'object') throw Error('Price table needs currency USD, asOf, and models.');
  const ids = new Set(); let total = 0n;
  const rows = records.map(record => {
    if (!record || typeof record.id !== 'string' || !record.id || ids.has(record.id)) throw Error('Every request needs a unique, nonempty id.');
    ids.add(record.id);
    if (typeof record.model !== 'string') throw Error('Every record needs a model.');
    const input = count(record.input_tokens, 'input_tokens');
    const output = count(record.output_tokens, 'output_tokens');
    const cached = count(record.cached_input_tokens ?? 0, 'cached_input_tokens');
    if (cached > input) throw Error('Cached input cannot exceed total input.');
    const price = Object.hasOwn(table.models, record.model) ? table.models[record.model] : null;
    if (!price) return {id:record.id, model:record.model, costUSD:null, reason:'No configured price'};
    const units = (input-cached)*rate(price.input) + output*rate(price.output) + cached*rate(price.cachedInput ?? price.input);
    total += units;
    return {id:record.id, model:record.model, costUSD:money(units)};
  });
  return {currency:'USD', priceAsOf:table.asOf, pricedSubtotalUSD:money(total), unpricedRequests:rows.filter(r=>r.costUSD===null).length, rows};
}

export function sessionMarkdown({goal='', decisions='', checks='', next='', git=null}) {
  for (const value of [goal,decisions,checks,next]) if (typeof value !== 'string' || value.length > 100000) throw Error('Notes must be text under 100,000 characters.');
  if (git !== null && (git.schema_version !== 1 || typeof git.head !== 'string' || !Array.isArray(git.changes))) throw Error('Invalid checkpoint JSON.');
  const section = (title, value) => `## ${title}\n\n${value.trim() || 'Not recorded.'}\n\n`;
  let result = '# Coding session checkpoint\n\nUser-authored notes; not independently verified.\n\n' + section('Goal',goal) + section('Decisions',decisions) + section('Checks reported by user',checks) + section('Next steps',next);
  if (git) result += '## Git snapshot\n\n```json\n' + JSON.stringify(git,null,2).replaceAll('`','\\u0060') + '\n```\n';
  return result;
}
