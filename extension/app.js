import {inspectAnswer, checkableURL, checkURL, estimateCosts, sessionMarkdown} from './core.js';
const $ = id => document.getElementById(id);
const status = text => { $('status').textContent = text; };
let links = [], usage, prices, git = null, report;
const download = (name, content, type) => {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const run = fn => async () => { try { await fn(); } catch (error) { status(error.message); } };
const card = (title, detail) => {
  const box = document.createElement('article'); const heading = document.createElement('strong');
  heading.textContent = title; const p = document.createElement('p'); p.textContent = detail;
  box.append(heading, p); $('review-result').append(box); return p;
};
document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => {
  document.querySelectorAll('[data-tab]').forEach(other => {
    const active = other === button; other.setAttribute('aria-pressed', String(active)); $(other.dataset.tab).hidden = !active;
  }); status('');
});
const close = () => { if (parent !== window) parent.postMessage({type:'replydesk-close'}, 'https://chatgpt.com'); else window.close(); };
$('close').onclick = close;
document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
$('capture').onclick = () => {
  if (parent === window) return status('Paste an answer here, or use the floating panel on ChatGPT.');
  parent.postMessage({type:'replydesk-capture'}, 'https://chatgpt.com');
};
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== 'https://chatgpt.com' || event.data?.type !== 'replydesk-answer' || typeof event.data.text !== 'string') return;
  $('answer').value = event.data.text.slice(0,100000); links = []; $('check').hidden = true;
  status(event.data.text ? 'Text captured. Review it before checking links.' : 'No reply found. Paste text instead.');
});
$('answer').oninput = () => { links = []; $('check').hidden = true; };
$('inspect').onclick = run(() => {
  const result = inspectAnswer($('answer').value); $('review-result').replaceChildren(); links = [];
  for (const raw of result.links) {
    try { const url = checkableURL(raw).href; card(url, 'Ready for an explicit link check.'); links.push(url); }
    catch { card(raw, 'Not eligible for network checks.'); }
  }
  for (const candidate of result.candidates) card(candidate.reasons.join(' · '), candidate.sentence);
  $('check').hidden = !links.length;
  status(`${result.links.length} links; ${result.candidates.length} review candidates. Unflagged text is not verified. Checks are limited to 20 links at a time.`);
});
$('check').onclick = run(async () => {
  if (!globalThis.chrome?.permissions) return status('Network checks require the installed extension. Local preview supports text analysis only.');
  const selected = [...new Set(links)].slice(0,20);
  if (!selected.length) return;
  // Request permissions before awaiting anything: Chrome requires a user gesture.
  const allowed = await chrome.permissions.request({origins:[...new Set(selected.map(value => new URL(value).origin + '/*'))]});
  if (!allowed) return status('Permission declined. No links checked.');
  $('check').disabled = true;
  try {
    for (const url of selected) { const result = await checkURL(url); card(result.url, `${result.verdict} (${result.status ?? 'unknown'}) · ${result.checkedAt}`); }
    status('Checks finished. HTTP availability does not establish factual accuracy.');
  } finally { $('check').disabled = false; }
});
$('revoke').onclick = run(async () => {
  if (!globalThis.chrome?.permissions) return status('No extension permissions in this preview.');
  const {origins = []} = await chrome.permissions.getAll();
  const optional = origins.filter(origin => origin !== 'https://chatgpt.com/*');
  if (optional.length) await chrome.permissions.remove({origins:optional});
  status('Optional link-check permissions removed. ChatGPT integration remains enabled.');
});
for (const [id, assign] of [['usage-file', value => {usage=value;}], ['prices-file', value => {prices=value;}], ['git-file', value => {git=value;}]]) {
  $(id).onchange = run(async () => {
    const file = $(id).files[0]; if (!file) return;
    if (file.size > 2*1024*1024) throw Error('Use a JSON file smaller than 2 MiB.');
    const value = JSON.parse(await file.text()); assign(value); report = null; $('cost-export').disabled = true; status(`Loaded ${file.name}.`);
  });
}
$('sample').onclick = () => {
  usage = [{id:'demo-1',model:'example-model',input_tokens:1000,output_tokens:200,cached_input_tokens:200}];
  prices = {currency:'USD',asOf:'fictional example',models:{'example-model':{input:'1.00',output:'4.00',cachedInput:'0.25'}}};
  report=null; $('cost-export').disabled=true; status('Fictional usage and prices loaded. Click Estimate costs.');
};
$('estimate').onclick = run(() => { report=estimateCosts(usage,prices); $('cost-result').textContent=JSON.stringify(report,null,2); $('cost-export').disabled=false; status('Estimate ready. Unpriced requests are excluded from the subtotal.'); });
$('cost-export').onclick = () => { if(report) download('cost-report.json',JSON.stringify(report,null,2),'application/json'); };
$('export').onclick = run(() => { download('SESSION.md',sessionMarkdown({goal:$('goal').value,decisions:$('decisions').value,checks:$('checks').value,next:$('next').value,git}),'text/markdown'); status('Checkpoint downloaded. Review it before sharing.'); });
