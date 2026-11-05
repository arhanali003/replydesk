(() => {
  if (document.getElementById('replydesk-root')) return;
  const host = document.createElement('div'); host.id = 'replydesk-root';
  const shadow = host.attachShadow({mode:'closed'});
  const style = document.createElement('style');
  style.textContent = ':host{all:initial}button{position:fixed;right:24px;bottom:24px;width:48px;height:48px;border-radius:50%;border:1px solid #ddd;background:linear-gradient(150deg,#6ac4ff,#096aca);color:#fff;font:24px system-ui;box-shadow:0 5px 22px #0002;cursor:pointer;z-index:2147483646}button:focus-visible{outline:3px solid #1683d7}iframe{position:fixed;right:20px;bottom:84px;width:min(420px,calc(100vw - 32px));height:min(640px,calc(100dvh - 110px));border:1px solid #c5e2f5;border-radius:22px;background:#edf8ff;box-shadow:0 18px 60px #0003;z-index:2147483646}iframe[hidden]{display:none}';
  const button = document.createElement('button'); button.textContent='···'; button.title='Open Replydesk'; button.setAttribute('aria-label','Open Replydesk'); button.setAttribute('aria-expanded','false');
  const frame = document.createElement('iframe'); frame.title='Replydesk tools'; frame.src=chrome.runtime.getURL('panel.html'); frame.hidden=true;
  const origin = chrome.runtime.getURL('').replace(/\/$/, '');
  button.onclick=()=>{frame.hidden=!frame.hidden;button.setAttribute('aria-expanded',String(!frame.hidden));};
  window.addEventListener('message', event => {
    if(event.source!==frame.contentWindow || event.origin!==origin) return;
    if(event.data?.type==='replydesk-close'){frame.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}
    if(event.data?.type==='replydesk-capture'){
      const selected=window.getSelection()?.toString().trim();
      const messages=document.querySelectorAll('[data-message-author-role="assistant"]');
      const last=messages[messages.length-1];
      const text=selected || last?.innerText || '';
      const urls = selected ? [] : [...(last?.querySelectorAll('a[href]') || [])].map(a=>a.href).filter(h=>/^https?:/.test(h));
      frame.contentWindow.postMessage({type:'replydesk-answer',text:[text,...urls].join('\n').slice(0,100000)},origin);
    }
  });
  shadow.append(style,frame,button); document.documentElement.append(host);
})();
