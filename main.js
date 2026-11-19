(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const out = $('#out');
  const screen = $('#screen');
  const form = $('#prompt');
  const input = $('#cmd');
  const mode = $('#mode');
  const hint = $('#hint');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PS1 = '<span class="ps1"><span class="u">kobe</span><span class="dim">@</span><span class="h">kobecloud</span><span class="dim">:</span><span class="p">~</span><span class="dim">$</span></span>';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text || href.replace(/^https?:\/\//, '')}</a>`;

  /* ---------- content ---------- */

  const projects = [
    { name: 'homelab-infra/', url: 'https://github.com/kobewijnants/homelab-infra', desc: 'Kubernetes on my Proxmox cluster, provisioned with Terraform, running Talos Linux.', tags: 'proxmox · terraform · talos · k8s' },
    { name: 'IP2-deployment/', url: 'https://github.com/kobewijnants/IP2-deployment', desc: 'DevOps team for four dev teams: GKE clusters, Cloud SQL and networking in Terraform, one deploy script per team.', tags: 'gcp · gke · terraform · bash' },
    { name: 'IP1-deployment/', url: 'https://github.com/kobewijnants/IP1-deployment', desc: 'Full Google Cloud rollout in bash: autoscaling instance groups, load balancer, SSL, Redis, backups, rolling updates.', tags: 'gcp · bash · cloudflare' },
    { name: 'K10s/', url: 'https://github.com/EliasDeHondt/K10s', desc: 'Visualises the hierarchy of Kubernetes clusters, from superclusters down to pods.', tags: 'kubernetes · go · web' },
    { name: 'internship/', url: 'https://github.com/EliasDeHondt/Internship', desc: 'Network monitoring and discovery at the University of Buckingham (UK), documented week by week.', tags: 'networking · monitoring' },
    { name: 'dotfiles/', url: 'https://github.com/kobewijnants/dotfiles', desc: 'sway, kitty, zsh, k9s, lazygit. Managed with GNU Stow.', tags: 'linux · sway · stow' },
  ];

  const rack = [
    '<span class="d">┌────────────────────┐</span>',
    '<span class="d">│</span> [====] ::::  <span class="led">•</span> <span class="led">•</span>   <span class="d">│</span> <span class="d">alpha</span>',
    '<span class="d">├────────────────────┤</span>',
    '<span class="d">│</span> [====] ::::  <span class="led">•</span> <span class="led">•</span>   <span class="d">│</span> <span class="d">beta</span>',
    '<span class="d">├────────────────────┤</span>',
    '<span class="d">│</span> ░░░░░░░░░░░░░░░░░░ <span class="d">│</span>',
    '<span class="d">├────────────────────┤</span>',
    '<span class="d">│</span> [][][][]   <span class="led">•</span><span class="led">•</span><span class="led">•</span><span class="led">•</span>    <span class="d">│</span> <span class="d">switch</span>',
    '<span class="d">└────────────────────┘</span>',
  ].join('\n');

  const loaded = Date.now();
  function uptime() {
    const s = Math.floor((Date.now() - loaded) / 1000);
    return s < 60 ? `${s}s (of this tab, anyway)` : `${Math.floor(s / 60)} min (of this tab, anyway)`;
  }

  const C = {
    help: () => `<div class="help">${[
      ['whoami', 'who I am'],
      ['ls -l ~/projects', 'things I have built'],
      ['neofetch', 'the homelab'],
      ['cat contact.txt', 'how to reach me'],
      ['theme [light|dark]', 'switch colours'],
      ['history', 'commands you ran'],
      ['clear', 'clear the screen (Ctrl+L)'],
    ].map(([c, d]) => `<span class="c">${c}</span><span class="dim">${d}</span>`).join('')}</div>`
      + `\n<span class="dim">Tab completes, ↑/↓ walks history. There are a few commands not on this list.</span>`,

    whoami: () => [
      `<span class="big">Kobe Wijnants</span>`,
      `<span class="o">DevOps · cloud · infrastructure</span> <span class="dim">— Belgium</span>`,
      ``,
      `I build and run platforms: Kubernetes clusters, the Terraform that`,
      `creates them, and the pipelines that ship onto them. Graduated in`,
      `Applied Computer Science at KdG, specialised in infrastructure.`,
      ``,
      `At home I run <span class="g">kobecloud</span>, a two-node Proxmox cluster with Talos`,
      `Kubernetes on top. It's where most ideas get broken before they`,
      `get built.`,
      ``,
      `<span class="dim">stack</span>  <span class="b">kubernetes</span> <span class="b">terraform</span> <span class="b">proxmox</span> <span class="b">talos</span> <span class="b">gcp</span> <span class="b">linux</span> <span class="b">bash</span> <span class="b">docker</span>`,
    ].join('\n'),

    projects: () => `<span class="dim">total ${projects.length}</span>\n<div class="ls">${projects.map((p) =>
      `<span class="perm">drwxr-xr-x  kobe</span><span>${link(p.url, `<span class="b bold">${p.name}</span>`)}</span><span class="desc">${p.desc}\n<span class="tags">${p.tags}</span></span>`
    ).join('')}</div>`,

    neofetch: () => `<div class="fetch"><pre aria-hidden="true">${rack}</pre><div class="info">${[
      `<span class="g bold">kobe</span>@<span class="b bold">kobecloud</span>`,
      `<span class="dim">──────────────</span>`,
      kv('Cluster', 'kobecloud (2 nodes)'),
      kv('Nodes', '<span class="g">●</span> alpha  <span class="g">●</span> beta'),
      kv('Hypervisor', 'Proxmox VE'),
      kv('Kubernetes', 'Talos Linux'),
      kv('IaC', 'Terraform'),
      kv('Shell', 'zsh'),
      kv('Terminal', 'kitty'),
      kv('WM', 'sway'),
      kv('Tools', 'k9s, lazygit, kubectl'),
      ``,
      ['--red', '--yellow', '--green', '--blue', '--purple', '--orange', '--fg']
        .map((v) => `<span class="swatch" style="background:var(${v})"></span>`).join(''),
    ].map((l) => `<div>${l || '&nbsp;'}</div>`).join('')}</div></div>`,

    contact: () => [
      `<span class="dim"># contact.txt</span>`,
      ``,
      `${pad('github')}${link('https://github.com/kobewijnants')}`,
      `${pad('linkedin')}${link('https://linkedin.com/in/kobe-wijnants')}`,
      `${pad('web')}${link('https://kobecloud.be')}`,
      ``,
      `<span class="dim">Open to DevOps, platform and cloud roles. Say hi on LinkedIn.</span>`,
    ].join('\n'),
  };

  function kv(k, v) { return `<span class="k">${k}</span>${v}`; }
  function pad(k) { return `<span class="o">${k.padEnd(10)}</span>`; }

  /* ---------- easter eggs & misc ---------- */

  const nodesTable = () => [
    `<span class="bold">NAME    STATUS   OS</span>`,
    `alpha   <span class="g">Ready</span>    Talos Linux`,
    `beta    <span class="g">Ready</span>    Talos Linux`,
  ].join('\n');

  const files = ['contact.txt', 'projects/', 'homelab/', '.secrets'];

  function run(raw) {
    const line = raw.trim();
    if (!line) return '';
    const [cmd, ...args] = line.split(/\s+/);
    const a = args.join(' ');

    switch (cmd) {
      case 'help': case '?': case 'man': return C.help();
      case 'whoami': case 'about': return C.whoami();
      case 'projects': return C.projects();
      case 'ls': case 'll': case 'dir':
        if (/projects/.test(a) || cmd === 'll' && !a) return C.projects();
        if (/homelab/.test(a)) return C.neofetch();
        if (/-a/.test(a)) return files.map((f) => f.endsWith('/') ? `<span class="b bold">${f}</span>` : f).join('  ');
        return files.filter((f) => !f.startsWith('.')).map((f) => f.endsWith('/') ? `<span class="b bold">${f}</span>` : f).join('  ');
      case 'neofetch': case 'fastfetch': case 'homelab': return C.neofetch();
      case 'contact': return C.contact();
      case 'cat': case 'less': case 'more': case 'bat':
        if (!a) return `<span class="dim">usage: ${cmd} &lt;file&gt;</span>`;
        if (/contact/.test(a)) return C.contact();
        if (/secret/.test(a)) return `<span class="r">${cmd}: ${esc(a)}: Permission denied</span>\n<span class="dim">nice try.</span>`;
        if (/\/$/.test(a) || /projects|homelab/.test(a)) return `${cmd}: ${esc(a)}: Is a directory`;
        return `${cmd}: ${esc(a)}: No such file or directory`;
      case 'cd':
        if (!a || a === '~') return '';
        return `<span class="dim">cd: this is a website, not a filesystem. Try</span> ls -l ~/projects`;
      case 'pwd': return '/home/kobe';
      case 'echo': return esc(a);
      case 'date': return new Date().toString();
      case 'uptime': return uptime();
      case 'theme': return setTheme(args[0]);
      case 'history': return hist.map((h, i) => `<span class="dim">${String(i + 1).padStart(4)}</span>  ${esc(h)}`).join('\n') || '<span class="dim">no history yet</span>';
      case 'sudo':
        return `<span class="r">kobe is not in the sudoers file. This incident will be reported.</span>`;
      case 'kubectl': case 'k':
        if (/get\s+(nodes|no)\b/.test(a)) return nodesTable();
        if (/get\s+(pods|po)\b/.test(a)) return `<span class="bold">NAME                    READY   STATUS    RESTARTS</span>\nkobecloud-web-7d9f8     1/1     <span class="g">Running</span>   0\ncoffee-maker-5b6c4      0/1     <span class="y">Pending</span>   0   <span class="dim"># out of beans</span>`;
        return `<span class="dim">try:</span> kubectl get nodes`;
      case 'k9s': return `<span class="dim">k9s needs a real TTY. Here's the short version:</span>\n${nodesTable()}`;
      case 'terraform':
        if (/destroy/.test(a)) return `<span class="r">Error: refusing to destroy production on a Tuesday. (or any day)</span>`;
        return `<span class="g">No changes.</span> Your infrastructure matches the configuration.`;
      case 'vim': case 'vi': case 'nvim': case 'nano': case 'emacs':
        return `<span class="dim">${cmd}: you'll never get out. Opening nothing instead.</span>\n<span class="dim">(hint: you'd need</span> :q!<span class="dim">)</span>`;
      case ':q': case ':q!': case ':wq': case ':x': return '<span class="dim">you\'re free. there was no vim.</span>';
      case 'ssh': return `ssh: connect to host ${esc(args[0] || 'alpha')} port 22: <span class="r">Permission denied (publickey).</span>`;
      case 'ping': return `PING ${esc(args[0] || 'alpha')}: 64 bytes, time=0.3 ms <span class="dim">(it's in the next room)</span>`;
      case 'rm':
        if (/-rf?\s+\/?/.test(a)) return `<span class="r">rm: it is dangerous to operate recursively on '/'</span>\n<span class="dim">and also rude.</span>`;
        return `rm: cannot remove '${esc(a)}': Read-only file system`;
      case 'exit': case 'logout': case 'quit': return '<span class="dim">there is no escape. try</span> clear';
      case 'git': return /log/.test(a) ? '<span class="y">commit 1a2b3c4</span> (HEAD -> main)\n    fix: it works on my cluster' : `<span class="dim">git: everything lives at</span> ${link('https://github.com/kobewijnants')}`;
      case 'hello': case 'hi': case 'hey': return 'hi there 👋  type <span class="g">help</span> to look around.';
      case 'clear': case 'cls': return null;
      default:
        return `<span class="r">${esc(cmd)}: command not found</span>. Type <span class="g">help</span>.`;
    }
  }

  const completions = ['help', 'whoami', 'ls', 'ls -l ~/projects', 'neofetch', 'cat contact.txt', 'contact', 'projects',
    'theme', 'theme light', 'theme dark', 'history', 'clear', 'kubectl get nodes', 'kubectl get pods', 'echo', 'date', 'pwd', 'sudo', 'vim'];

  /* ---------- rendering ---------- */

  function block(cmdText, html) {
    const el = document.createElement('div');
    el.className = 'block';
    el.innerHTML = `${PS1} <span class="cmdline">${esc(cmdText)}</span>` + (html ? `\n${html}` : '');
    out.appendChild(el);
    return el;
  }

  function scrollDown() { screen.scrollTop = screen.scrollHeight; }

  function markTab(cmdText) {
    const r = cmdText.trim();
    let key = null;
    if (/^(whoami|about)$/.test(r)) key = 'whoami';
    else if (/^(projects|ll|ls .*projects)/.test(r)) key = 'ls -l ~/projects';
    else if (/^(neofetch|fastfetch|homelab)/.test(r)) key = 'neofetch';
    else if (/^(contact|cat .*contact)/.test(r)) key = 'cat contact.txt';
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.cmd === key)));
  }

  function exec(cmdText) {
    const res = run(cmdText);
    if (res === null) { out.innerHTML = ''; markTab(''); scrollDown(); return; }
    block(cmdText, res);
    markTab(cmdText);
    scrollDown();
  }

  /* ---------- boot sequence ---------- */

  let skipping = false;
  let booting = true;
  const sleep = (ms) => new Promise((r) => setTimeout(r, skipping ? 0 : ms));

  async function typeCmd(text) {
    const el = document.createElement('div');
    el.className = 'block';
    el.innerHTML = `${PS1} <span class="cmdline"></span><span class="cursor"></span>`;
    out.appendChild(el);
    const span = el.querySelector('.cmdline');
    await sleep(350);
    for (const ch of text) {
      if (skipping) { span.textContent = text; break; }
      span.textContent += ch;
      scrollDown();
      await sleep(38 + Math.random() * 55);
    }
    await sleep(220);
    el.querySelector('.cursor').remove();
    const res = run(text);
    el.insertAdjacentHTML('beforeend', '\n' + res);
    markTab(text);
    scrollDown();
    await sleep(500);
  }

  async function boot() {
    if (reduced) skipping = true;
    for (const c of ['whoami', 'ls -l ~/projects', 'neofetch', 'cat contact.txt']) await typeCmd(c);
    finishBoot();
  }

  function finishBoot() {
    if (!booting) return;
    booting = false;
    const tip = document.createElement('div');
    tip.className = 'block dim';
    tip.innerHTML = 'Type <span class="g">help</span> to see what else is here.';
    out.appendChild(tip);
    form.hidden = false;
    mode.textContent = 'INSERT';
    mode.classList.add('ins');
    hint.textContent = 'type help';
    markTab('');
    scrollDown();
    if (!matchMedia('(pointer: coarse)').matches) input.focus({ preventScroll: true });
  }

  function skip() { if (booting) skipping = true; }
  window.addEventListener('keydown', skip, { capture: true });
  window.addEventListener('pointerdown', skip, { capture: true });

  /* ---------- input ---------- */

  const hist = [];
  let hi = 0;
  try { const h = JSON.parse(localStorage.getItem('hist') || '[]'); if (Array.isArray(h)) hist.push(...h.slice(-50)); } catch (e) {}
  hi = hist.length;
  function saveHist() { try { localStorage.setItem('hist', JSON.stringify(hist.slice(-50))); } catch (e) {} }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    if (v.trim()) { hist.push(v.trim()); saveHist(); }
    hi = hist.length;
    if (!v.trim()) { block('', ''); scrollDown(); return; }
    exec(v);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hi > 0) { hi--; input.value = hist[hi]; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hi < hist.length - 1) { hi++; input.value = hist[hi]; } else { hi = hist.length; input.value = ''; }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      complete();
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      out.innerHTML = '';
      markTab('');
    } else if (e.key === 'c' && e.ctrlKey && !window.getSelection().toString()) {
      e.preventDefault();
      block(input.value + '^C', '');
      input.value = '';
      scrollDown();
    }
  });

  function complete() {
    const v = input.value;
    if (!v) return;
    const matches = completions.filter((c) => c.startsWith(v));
    if (matches.length === 1) { input.value = matches[0] + (matches[0].endsWith(' ') ? '' : ' '); return; }
    if (matches.length > 1) {
      let pre = matches[0];
      for (const m of matches) while (!m.startsWith(pre)) pre = pre.slice(0, -1);
      if (pre.length > v.length) { input.value = pre; return; }
      block(v, matches.map((m) => `<span class="g">${esc(m)}</span>`).join('   '));
      scrollDown();
    }
  }

  screen.addEventListener('click', () => {
    if (!booting && !window.getSelection().toString()) input.focus({ preventScroll: true });
  });

  document.querySelectorAll('[data-cmd]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const c = b.dataset.cmd;
    if (booting) { skipping = true; return; }
    if (b.closest('.tabs')) out.innerHTML = '';
    hist.push(c); saveHist(); hi = hist.length;
    exec(c);
    if (b.closest('.tabs')) screen.scrollTop = 0;
  }));

  /* ---------- theme ---------- */

  function currentTheme() {
    return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  }
  function setTheme(t) {
    if (t !== 'light' && t !== 'dark') t = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch (e) {}
    return `<span class="dim">theme set to</span> ${t}`;
  }
  $('#themeBtn').addEventListener('click', (e) => { e.stopPropagation(); setTheme(); });

  /* ---------- clock ---------- */

  const clock = $('#clock');
  const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
  tick();
  setInterval(tick, 15000);

  boot();
})();
