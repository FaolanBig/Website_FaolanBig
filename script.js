const $ = (s) => document.querySelector(s);
const API = "https://api.github.com";
const COLORS = {JavaScript:"#f1e05a",TypeScript:"#3178c6",Python:"#3572A5",Java:"#b07219","C#":"#178600",C:"#555555","C++":"#f34b7d",HTML:"#e34c26",CSS:"#563d7c",Go:"#00ADD8",Rust:"#dea584",Shell:"#89e051",PowerShell:"#012456",Kotlin:"#A97BFF",PHP:"#4F5D95",Ruby:"#701516",Vue:"#41b883"};
const color = (l) => COLORS[l] || "#8b8fa8";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : n);
const ago = (d) => {
  const days = Math.floor((Date.now() - new Date(d)) / 864e5);
  if (days < 1) return "today";
  if (days < 31) return days + "d ago";
  if (days < 365) return Math.floor(days / 30) + "mo ago";
  return Math.floor(days / 365) + "y ago";
};

async function gh(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

function repoCard(r, note) {
  return `<a class="card" href="${esc(r.html_url)}" target="_blank" rel="noopener">
    <h3>${esc(r.name)}</h3>
    <p>${esc(r.description || "No description provided.")}</p>
    ${note ? `<p class="note">“${esc(note)}”</p>` : ""}
    <div class="tags">${(r.topics || []).slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    <div class="meta">
      ${r.language ? `<span><span class="dot" style="--c:${color(r.language)}"></span>${esc(r.language)}</span>` : ""}
      <span>★ ${fmt(r.stargazers_count)}</span><span>⑂ ${fmt(r.forks_count)}</span>
      <span>${ago(r.pushed_at)}</span>
    </div></a>`;
}

// Tilt effect on cards
document.addEventListener("pointermove", (e) => {
  const c = e.target.closest?.("a.card");
  if (!c) return;
  const b = c.getBoundingClientRect();
  const x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
  c.style.transform = `translateY(-6px) perspective(700px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`;
});
document.addEventListener("pointerout", (e) => {
  const c = e.target.closest?.("a.card");
  if (c) c.style.transform = "";
});

function typer() {
  const el = $("#typed");
  let i = 0, j = 0, del = false;
  (function tick() {
    const w = CONFIG.taglines[i];
    el.textContent = w.slice(0, j);
    if (!del && j === w.length) { del = true; return setTimeout(tick, 1400); }
    if (del && j === 0) { del = false; i = (i + 1) % CONFIG.taglines.length; }
    j += del ? -1 : 1;
    setTimeout(tick, del ? 40 : 90);
  })();
}

function renderProfile(u, repos) {
  $("#name").textContent = u.name || u.login;
  $("#navName").textContent = u.login;
  $("#avatar").src = u.avatar_url;
  $("#bio").textContent = u.bio || "";
  $("#ghLink").href = $("#footLink").href = u.html_url;
  document.title = `${u.name || u.login} — Developer Portfolio`;
  document.querySelectorAll("[data-k]").forEach((e) => (e.textContent = u[e.dataset.k] ?? 0));
  $("#stars").textContent = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const info = [
    u.location && `📍 ${u.location}`,
    u.company && `🏢 ${u.company}`,
    u.blog && `🔗 <a href="${esc(/^https?:/.test(u.blog) ? u.blog : "https://" + u.blog)}" target="_blank" rel="noopener">${esc(u.blog)}</a>`,
    u.twitter_username && `🐦 @${esc(u.twitter_username)}`,
    `📅 On GitHub since ${new Date(u.created_at).getFullYear()}`
  ].filter(Boolean);
  $("#info").innerHTML = info.map((i) => `<li>${i}</li>`).join("");

  const counts = {};
  repos.forEach((r) => r.language && (counts[r.language] = (counts[r.language] || 0) + 1));
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  $("#langs").innerHTML = top.length
    ? top.map(([l, n]) => `<div><div class="langrow"><span>${esc(l)}</span><span>${Math.round((n / total) * 100)}%</span></div><div class="bar"><i style="--c:${color(l)}" data-w="${(n / total) * 100}"></i></div></div>`).join("")
    : '<p class="muted">No language data yet.</p>';
  requestAnimationFrame(() => setTimeout(() => document.querySelectorAll(".bar i").forEach((b) => (b.style.width = b.dataset.w + "%")), 200));

  const sel = $("#langFilter");
  Object.keys(counts).sort().forEach((l) => sel.insertAdjacentHTML("beforeend", `<option>${esc(l)}</option>`));
}

function renderRepos(repos) {
  const popular = [...repos].sort((a, b) => b.stargazers_count + b.forks_count - (a.stargazers_count + a.forks_count) || new Date(b.pushed_at) - new Date(a.pushed_at)).slice(0, CONFIG.popularCount);
  $("#popularGrid").innerHTML = popular.map((r) => repoCard(r)).join("") || '<p class="muted">No public repositories yet.</p>';
  const recent = [...repos].sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  const draw = () => {
    const q = $("#search").value.toLowerCase(), l = $("#langFilter").value;
    const list = recent.filter((r) => (!l || r.language === l) && (`${r.name} ${r.description || ""} ${(r.topics || []).join(" ")} ${r.language || ""}`).toLowerCase().includes(q)).slice(0, q || l ? 50 : CONFIG.recentCount);
    $("#recentGrid").innerHTML = list.map((r) => repoCard(r)).join("") || '<p class="muted">No matching projects.</p>';
  };
  $("#search").oninput = $("#langFilter").onchange = draw;
  draw();
}

async function renderFavorites() {
  const grid = $("#favGrid");
  const cards = await Promise.all(FAVORITES.map(async (f) => {
    try { return repoCard(await gh(`/repos/${f.repo}`), f.note); }
    catch {
      return `<a class="card" href="https://github.com/${esc(f.repo)}" target="_blank" rel="noopener"><h3>${esc(f.repo)}</h3><p>${esc(f.note || "")}</p></a>`;
    }
  }));
  grid.innerHTML = cards.join("");
}

function background() {
  const c = $("#bg"), x = c.getContext("2d");
  let w, h, pts;
  const mouse = { x: -999, y: -999 };
  const init = () => {
    w = c.width = innerWidth; h = c.height = innerHeight;
    pts = Array.from({ length: Math.min(90, Math.floor((w * h) / 18000)) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4 }));
  };
  addEventListener("resize", init);
  addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  init();
  (function frame() {
    x.clearRect(0, 0, w, h);
    const rgb = document.documentElement.classList.contains("light") ? "100,80,220" : "140,130,255";
    pts.forEach((p, i) => {
      p.x = (p.x + p.vx + w) % w; p.y = (p.y + p.vy + h) % h;
      x.fillStyle = `rgba(${rgb},.7)`; x.beginPath(); x.arc(p.x, p.y, 1.6, 0, 7); x.fill();
      for (let k = i + 1; k < pts.length; k++) {
        const q = pts[k], d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 120) { x.strokeStyle = `rgba(${rgb},${.25 * (1 - d / 120)})`; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(q.x, q.y); x.stroke(); }
      }
      const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      if (dm < 160) { x.strokeStyle = `rgba(0,209,255,${.5 * (1 - dm / 160)})`; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(mouse.x, mouse.y); x.stroke(); }
    });
    requestAnimationFrame(frame);
  })();
}

function setup() {
  const saved = localStorage.getItem("theme");
  if (saved === "light") document.documentElement.classList.add("light");
  $("#theme").onclick = () => localStorage.setItem("theme", document.documentElement.classList.toggle("light") ? "light" : "dark");
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach((e) => io.observe(e));
}

(async function main() {
  setup(); background(); typer(); renderFavorites();
  try {
    const [user, all] = await Promise.all([
      gh(`/users/${CONFIG.username}`),
      gh(`/users/${CONFIG.username}/repos?per_page=100&sort=pushed`)
    ]);
    const repos = all.filter((r) => !r.archived && !(CONFIG.hideForks && r.fork));
    renderProfile(user, repos);
    renderRepos(repos);
  } catch (e) {
    const msg = '<p class="muted">Could not load GitHub data (rate limit or network). Please try again later.</p>';
    $("#popularGrid").innerHTML = $("#recentGrid").innerHTML = msg;
  }
})();
