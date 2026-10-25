'use strict';

/* ==========================================================================
   Reelverse – app logic
   1. Config   2. State   3. Helpers   4. TMDB API   5. Templates
   6. Filters  7. Listing   8. Details modal   9. Events   10. Init
   ========================================================================== */

/* 1. Config --------------------------------------------------------------- */


const TMDB_KEY = '95b8738b84f42eeaa212be9afc517c28';
const API_URL  = 'https://api.themoviedb.org/3';
const IMG_URL  = 'https://image.tmdb.org/t/p/';

const STORAGE = { watchlist: 'rv2', region: 'rg' };

/** Genre code -> [label, colour] */
const GENRES = {
  T: ['Thriller & Mystery', '#35e0c6'],
  R: ['Romance & Rom-Com',  '#ff5c93'],
  A: ['Action',             '#ff8a3d'],
  S: ['Sci-Fi',             '#6aa7ff'],
  H: ['Horror',             '#ff4d4d'],
  C: ['Comedy',             '#ffd23f'],
  D: ['Drama',              '#b794f6'],
  K: ['Crime',              '#9bd14a'],
  F: ['Fantasy',            '#e879f9'],
  N: ['Animation',          '#5ee38f'],
  Y: ['Series',             '#7dd3fc'],
};

/** ISO language -> label (industry filter) */
const LANGUAGES = {
  ml: 'Malayalam', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', hi: 'Hindi',
  en: 'Hollywood', ko: 'Korean', ja: 'Japanese', es: 'Spanish', fr: 'French', tr: 'Turkish',
};

/** Single-letter codes used in CURATED_RAW -> ISO language */
const LANG_CODES = { m: 'ml', t: 'ta', u: 'te', k: 'kn', h: 'hi', e: 'en', o: 'ko', j: 'ja' };

/** Tab key -> [label, TMDB media type] */
const TYPES = {
  m: ['Movies', 'movie'],
  s: ['Series', 'tv'],
  p: ['Pakistani dramas', 'tv'],
  k: ['K-dramas', 'tv'],
  c: ['My picks', ''],
};

/** Genre code -> TMDB genre ids ("|" = OR) or "@keyword" for keyword-based genres */
const TMDB_GENRES = {
  movie: { T: '53|9648', R: '10749', A: '28', S: '878', H: '27', C: '35', D: '18', K: '80', F: '14', N: '16' },
  tv:    { T: '9648|80', R: '@romance', A: '10759', S: '10765', H: '@horror', C: '35', D: '18', K: '80', F: '10765', N: '16' },
};

const REGIONS = ['IN', 'PK', 'US', 'GB', 'AE', 'CA', 'AU', 'KR', 'SA', 'SG'];

const MIN_VOTES = {
  r: { p: 5, k: 40, default: 300 },   // top rated, by tab
  n: { m: 5, default: 1 },            // newest
  p: { m: 10, default: 0 },           // popular
};

const SEARCH_DEBOUNCE_MS = 350;
const MAX_TMDB_PAGES     = 500;
const WORDS = ['Get a movie.', 'Get a drama.', 'Get goosebumps.', 'Get butterflies.', 'Get your weekend.'];

/* 2. State ---------------------------------------------------------------- */

const state = {
  type: 'm',          // active tab
  genre: '*',
  lang: '*',
  query: '',
  sort: 'p',
  region: 'IN',
  page: 0,
  loading: false,
  ended: false,
  failed: false,
  watchlistOnly: false,
  requestToken: 0,    // invalidates stale responses
  scrollY: 0,         // saved while modal is open
};

let saved = {};       // key -> title (watchlist, persisted)
const titles = {};    // key -> title (every title seen this session)
const keywordCache = {};

/* 3. Helpers -------------------------------------------------------------- */

const $ = (id) => document.getElementById(id);

const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const hueFromText = (text) => {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

const initials = (text) =>
  text.replace(/[^\w\s]/g, '').split(/\s+/)
    .filter((w) => !/^(the|of|a|and)$/i.test(w))
    .slice(0, 3).map((w) => w[0]).join('').toUpperCase();

const formatCount = (n) => `<b>${n.toLocaleString()}</b> ${n === 1 ? 'title' : 'titles'}`;
const emptyMessage = (msg) => `<div class="empty">${msg}</div>`;
const skeletons = () => '<div class="sk"></div>'.repeat(14);

const yearOf = (item) => (item.release_date || item.first_air_date || '').slice(0, 4);
const withoutPromise = ({ pending, ...rest }) => rest;   // strip runtime-only field before saving

function readStorage() {
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE.watchlist) || '{}');
    state.region = localStorage.getItem(STORAGE.region) || state.region;
  } catch (_) { /* storage unavailable */ }
  Object.values(saved).forEach((t) => { titles[t.key] = t; });
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch (_) { /* storage unavailable */ }
}

function detectRegion() {
  const guess = (navigator.language.split('-')[1] || '').toUpperCase();
  if (REGIONS.includes(guess)) state.region = guess;
}

/** Parse the curated pipe-separated list into title objects. */
function loadCurated() {
  return CURATED_RAW.split('\n').map((line, i) => {
    const [title, year, langCode, genres] = line.split('|');
    const item = {
      key: 'c' + i,
      t: title,
      y: year,
      lc: LANG_CODES[langCode],
      g: genres,
      curated: true,
      k: genres.includes('Y') ? 'tv' : 'movie',
    };
    titles[item.key] = item;
    return item;
  });
}

/* 4. TMDB API ------------------------------------------------------------- */

async function api(path, params = {}) {
  const url = new URL(API_URL + path);
  url.search = new URLSearchParams({ api_key: TMDB_KEY, language: 'en-US', ...params });
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

async function keywordId(name) {
  if (!keywordCache[name]) {
    const data = await api('/search/keyword', { query: name });
    keywordCache[name] = data.results[0]?.id;
  }
  return keywordCache[name];
}

/** Convert a TMDB result into our title shape and register it. */
function normalize(x, kind) {
  const item = {
    key: kind[0] + x.id,
    id: x.id,
    k: kind,
    t: x.title || x.name || 'Untitled',
    y: yearOf(x),
    p: x.poster_path,
    r: x.vote_average,
    lc: x.original_language,
  };
  titles[item.key] = item;
  return item;
}

/** Curated titles have no TMDB id yet: look it up once (memoised on `pending`). */
function resolveTmdbId(item) {
  if (item.id) return Promise.resolve();
  if (item.pending) return item.pending;

  item.pending = (async () => {
    const yearKey = item.k === 'tv' ? 'first_air_date_year' : 'year';
    const exact = await api('/search/' + item.k, { query: item.t, [yearKey]: item.y });
    const hit = exact.results[0] || (await api('/search/' + item.k, { query: item.t })).results[0];
    if (hit) {
      item.id = hit.id;
      item.p = hit.poster_path;
      item.r = hit.vote_average;
    }
  })();
  return item.pending;
}

/** Build /discover parameters from current filters. */
async function discoverParams(kind) {
  const isTv = kind === 'tv';
  const dateKey = isTv ? 'first_air_date' : 'primary_release_date';
  const params = { sort_by: { p: 'popularity.desc', r: 'vote_average.desc', n: dateKey + '.desc' }[state.sort] };

  const votes = MIN_VOTES[state.sort];
  params['vote_count.gte'] = votes[state.type] ?? votes.default;
  if (state.sort === 'n') params[dateKey + '.lte'] = new Date().toISOString().slice(0, 10);

  if (state.genre !== '*') {
    const g = TMDB_GENRES[kind][state.genre];
    if (g[0] === '@') params.with_keywords = await keywordId(g.slice(1));
    else params.with_genres = g;
  }

  if (state.type === 'p') params.with_origin_country = 'PK';
  else if (state.type === 'k') params.with_origin_country = 'KR';
  else if (state.lang !== '*') params.with_original_language = state.lang;

  return params;
}

/* 5. Templates ------------------------------------------------------------ */

function posterHtml(item) {
  const h = hueFromText(item.t);
  const bg = `linear-gradient(160deg,hsl(${h} 70% 40%),hsl(${(h + 55) % 360} 60% 14%))`;
  const img = item.p ? `<img loading="lazy" alt="" src="${IMG_URL}w342${item.p}">` : '';
  return `<div class="ps" style="background:${bg}">${escapeHtml(initials(item.t))}${img}</div>`;
}

function cardHtml(item, n) {
  const dots = item.g
    ? `<div class="dots">${[...item.g].map((c) => `<u style="background:${GENRES[c][1]}"></u>`).join('')}</div>`
    : `<small>${LANGUAGES[item.lc] || ''}</small>`;

  return `
    <button class="tk" style="--n:${n % 20}" data-k="${item.key}" aria-label="${escapeHtml(item.t)}">
      ${posterHtml(item)}
      <i>${item.y || '—'}</i>
      ${item.r ? `<span class="rt">★ ${item.r.toFixed(1)}</span>` : ''}
      ${saved[item.key] ? '<span class="sv">♥</span>' : ''}
      <div class="in"><b>${escapeHtml(item.t)}</b>${dots}</div>
    </button>`;
}

/* 6. Filters -------------------------------------------------------------- */

function setChips(el, items, current, onPick) {
  el.innerHTML = items.map(([key, label, colour]) =>
    `<button class="chip" data-k="${key}" aria-pressed="${key === current}" ${colour ? `style="--c:${colour}"` : ''}>${label}</button>`
  ).join('');
  el.onclick = (e) => {
    const chip = e.target.closest('.chip');
    if (chip) onPick(chip.dataset.k);
  };
}

function applyAccent() {
  const colour = state.genre === '*' ? '#35e0c6' : GENRES[state.genre][1];
  document.documentElement.style.setProperty('--ac', colour);
}

function paintFilters() {
  const isPicks = state.type === 'c';

  setChips($('type-row'), Object.entries(TYPES).map(([k, v]) => [k, v[0]]), state.type, (k) => {
    Object.assign(state, { type: k, genre: '*', lang: '*', watchlistOnly: false });
    $('watchlist-toggle').setAttribute('aria-pressed', false);
    applyAccent(); paintFilters(); render();
  });

  const genreItems = Object.entries(GENRES)
    .filter(([k]) => k !== 'Y' || isPicks)
    .map(([k, v]) => [k, v[0], v[1]]);
  setChips($('genre-row'), [['*', 'All genres'], ...genreItems], state.genre, (k) => {
    state.genre = k; applyAccent(); paintFilters(); render();
  });

  setChips($('industry-row'), [['*', 'Every industry'], ...Object.entries(LANGUAGES)], state.lang, (k) => {
    state.lang = k; paintFilters(); render();
  });

  $('industry-row').style.display = (state.type === 'p' || state.type === 'k') ? 'none' : '';
  $('sort').style.display = isPicks ? 'none' : '';
}

/* 7. Listing -------------------------------------------------------------- */

let curated = [];

/** Titles shown in "My picks" or the watchlist, after filters. */
function localTitles() {
  const q = state.query;
  const source = state.watchlistOnly ? Object.values(saved) : curated;
  return source.filter((m) => {
    if (q && !m.t.toLowerCase().includes(q)) return false;
    if (state.watchlistOnly) return true;
    return (state.genre === '*' || m.g.includes(state.genre)) && (state.lang === '*' || m.lc === state.lang);
  });
}

/** Lazily fetch posters for curated titles as they scroll into view. */
const posterObserver = new IntersectionObserver((entries) => {
  entries.forEach(async (entry) => {
    if (!entry.isIntersecting) return;
    posterObserver.unobserve(entry.target);
    const item = titles[entry.target.dataset.k];
    if (!item || item.p) return;
    try {
      await resolveTmdbId(item);
      if (item.p) entry.target.querySelector('.ps').insertAdjacentHTML('beforeend', `<img alt="" src="${IMG_URL}w342${item.p}">`);
    } catch (_) { /* poster is optional */ }
  });
}, { rootMargin: '250px' });

/** Reset paging and draw the first page for the current filters. */
function render() {
  Object.assign(state, { page: 0, ended: false, loading: false, failed: false });
  state.requestToken++;
  $('more').textContent = '';

  if (state.type === 'c' || state.watchlistOnly) {
    const list = localTitles();
    $('count').innerHTML = formatCount(list.length);
    $('grid').innerHTML = list.length
      ? list.map(cardHtml).join('')
      : emptyMessage(state.watchlistOnly ? 'Nothing saved yet. Tap ♥ on any title.' : 'No match. Try another genre or clear the search.');
    $('grid').querySelectorAll('.tk').forEach((b) => { if (!titles[b.dataset.k].p) posterObserver.observe(b); });
    return;
  }

  $('grid').innerHTML = skeletons();
  $('count').innerHTML = 'Loading…';
  loadMore();
}

async function fetchPage(kind) {
  const params = { page: state.page + 1, include_adult: false };

  if (state.query) {
    const data = await api('/search/' + kind, { ...params, query: state.query });
    if (state.type === 'p' || state.type === 'k') {
      const country = state.type === 'p' ? 'PK' : 'KR';
      data.results = data.results.filter((x) => (x.origin_country || []).includes(country));
    }
    return data;
  }
  return api('/discover/' + kind, { ...params, ...(await discoverParams(kind)) });
}

function showLoadError() {
  state.failed = true;
  if ($('grid').querySelector('.sk')) $('grid').innerHTML = '';
  $('count').textContent = '';

  if (!state.page) {
    // First page failed: fall back to the offline curated list.
    Object.assign(state, { type: 'c', genre: '*', lang: '*' });
    applyAccent(); paintFilters(); render();
    $('more').innerHTML = 'Couldn’t reach TMDB, so you’re seeing My picks. <button class="chip" id="retry">Try live data again</button>';
    $('retry').onclick = () => { state.type = 'm'; paintFilters(); render(); };
  } else {
    $('more').innerHTML = 'Couldn’t reach TMDB. <button class="chip" id="retry">Try again</button>';
    $('retry').onclick = () => { state.failed = false; state.loading = false; render(); };
  }
}

async function loadMore() {
  if (state.type === 'c' || state.watchlistOnly || state.loading || state.ended) return;

  state.loading = true;
  const token = state.requestToken;
  const kind = TYPES[state.type][1];
  $('more').textContent = 'Loading more…';

  try {
    const data = await fetchPage(kind);
    if (token !== state.requestToken) return;       // filters changed meanwhile

    if (!state.page) $('grid').innerHTML = '';
    const offset = $('grid').children.length;
    const items = data.results.map((x) => normalize(x, kind));
    $('grid').insertAdjacentHTML('beforeend', items.map((m, i) => cardHtml(m, offset + i)).join(''));

    state.page++;
    state.ended = state.page >= Math.min(data.total_pages, MAX_TMDB_PAGES);
    $('count').innerHTML = formatCount(data.total_results);

    if (!$('grid').children.length) $('grid').innerHTML = emptyMessage('No titles found. Try another filter or search.');
    $('more').textContent = state.ended && $('grid').querySelector('.tk') ? 'That’s everything for this filter.' : '';
  } catch (_) {
    if (token === state.requestToken) showLoadError();
  } finally {
    if (token === state.requestToken) {
      state.loading = false;
      // Keep filling the screen if the sentinel is still visible.
      if (!state.ended && !state.failed && $('more').getBoundingClientRect().top < innerHeight + 800) setTimeout(loadMore, 60);
    }
  }
}

/* 8. Details modal -------------------------------------------------------- */

function providerGroup(list, label) {
  if (!list?.length) return '';
  const chips = list.map((p) => `<span><img src="${IMG_URL}w92${p.logo_path}" alt="">${escapeHtml(p.provider_name)}</span>`).join('');
  return `<h3>${label}</h3><div class="pv">${chips}</div>`;
}

function pickTrailer(videos) {
  const yt = videos.results.filter((v) => v.site === 'YouTube');
  return yt.find((v) => v.type === 'Trailer' && v.official)
      || yt.find((v) => v.type === 'Trailer')
      || yt.find((v) => v.type === 'Teaser')
      || yt[0];
}

function lockScroll() {
  state.scrollY = scrollY;
  document.body.style.top = -state.scrollY + 'px';
  document.body.classList.add('lock');
}

function unlockScroll() {
  document.body.classList.remove('lock');
  document.body.style.top = '';
  scrollTo(0, state.scrollY || 0);
}

function actionsHtml(key) {
  return `<h3>Actions</h3><div class="lk">
    <button id="save-btn">${saved[key] ? '♥ Saved' : '♡ Save to watchlist'}</button>
    <button id="share-btn">Share</button></div>`;
}

function detailsHtml(item, d) {
  const trailer = pickTrailer(d.videos);
  const date = d.release_date || d.first_air_date || '';
  const name = d.title || d.name;
  const youtubeUrl = trailer
    ? 'https://www.youtube.com/watch?v=' + trailer.key
    : 'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${name} ${date.slice(0, 4)} official trailer`);

  const providers = d['watch/providers'].results[state.region] || {};
  const hasProviders = providers.flatrate || providers.rent || providers.buy;
  const runtime = d.runtime || (d.episode_run_time || [])[0];
  const seasons = d.number_of_seasons;
  const tags = [
    date.slice(0, 4),
    d.vote_average ? '★ ' + d.vote_average.toFixed(1) : '',
    runtime ? runtime + ' min' : '',
    seasons ? seasons + (seasons > 1 ? ' seasons' : ' season') : '',
    ...(d.genres || []).map((g) => g.name),
  ].filter(Boolean);

  const backdrop = d.backdrop_path ? `${IMG_URL}w780${d.backdrop_path}` : d.poster_path ? `${IMG_URL}w500${d.poster_path}` : '';
  const q = encodeURIComponent(`${item.t} ${item.y || ''}`);
  const justWatch = providers.link || `https://www.justwatch.com/${state.region.toLowerCase()}/search?q=${encodeURIComponent(item.t)}`;

  const html = `
    <div class="bk" style="background-image:url(${backdrop})">
      <button class="pl" id="play-btn">▶ ${trailer ? 'Play trailer' : 'Find trailer'}</button>
      <a class="yt" target="_blank" rel="noopener" href="${youtubeUrl}">Open on YouTube ↗</a>
    </div>
    <div class="bd">
      <h2>${escapeHtml(name)}</h2>
      ${d.tagline ? `<small style="color:var(--mu)">${escapeHtml(d.tagline)}</small>` : ''}
      <div class="tags">${tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>
      <p class="ov">${escapeHtml(d.overview || 'No description available yet.')}</p>
      ${d.credits.cast.length ? `<h3>Cast</h3><p>${d.credits.cast.slice(0, 8).map((c) => escapeHtml(c.name)).join(', ')}</p>` : ''}
      ${providerGroup(providers.flatrate, `Stream on (${state.region})`)}
      ${providerGroup(providers.rent, 'Rent')}
      ${providerGroup(providers.buy, 'Buy')}
      ${hasProviders ? '' : `<h3>Where to watch</h3><p>No streaming info for ${state.region} yet. Try the search below or change the region at the top.</p>`}
      <div class="lk" style="margin-top:12px">
        <a target="_blank" rel="noopener" href="${justWatch}">Open on JustWatch</a>
        <a target="_blank" rel="noopener" href="https://www.google.com/search?q=${q}+watch+online">Search Google</a>
      </div>
      ${actionsHtml(item.key)}
      <p class="note">Streaming data from JustWatch via TMDB. It changes often.</p>
    </div>`;

  return { html, trailer, youtubeUrl };
}

function bindTrailer(trailer, youtubeUrl) {
  $('play-btn').onclick = () => {
    if (!trailer || location.protocol === 'file:') { window.open(youtubeUrl, '_blank', 'noopener'); return; }
    $('play-btn').parentNode.innerHTML = `
      <iframe src="https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&playsinline=1&rel=0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Trailer"></iframe>
      <a class="yt" target="_blank" rel="noopener" href="${youtubeUrl}">Not playing? Open on YouTube ↗</a>`;
  };
}

function bindActions(item) {
  $('save-btn').onclick = () => {
    if (saved[item.key]) delete saved[item.key];
    else saved[item.key] = withoutPromise(item);
    writeStorage(STORAGE.watchlist, JSON.stringify(saved));
    $('save-btn').textContent = saved[item.key] ? '♥ Saved' : '♡ Save to watchlist';

    if (state.watchlistOnly) { render(); return; }
    const cardEl = document.querySelector(`.tk[data-k="${item.key}"]`);
    if (!cardEl) return;
    const heart = cardEl.querySelector('.sv');
    if (saved[item.key] && !heart) cardEl.insertAdjacentHTML('afterbegin', '<span class="sv">♥</span>');
    if (!saved[item.key] && heart) heart.remove();
  };

  $('share-btn').onclick = async () => {
    const data = { title: item.t, text: `Watch “${item.t}” (${item.y || ''}). Found on Reelverse.`, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(`${data.text} ${data.url}`); $('share-btn').textContent = 'Copied!'; }
    } catch (_) { /* user cancelled */ }
  };
}

async function openDetails(key) {
  const item = titles[key];
  if (!item) return;

  $('modal').classList.add('on');
  lockScroll();
  $('modal-body').scrollTop = 0;
  $('modal-body').innerHTML = '<div class="sk" style="aspect-ratio:16/9;border-radius:0"></div><div class="bd"><div class="sk" style="height:120px"></div></div>';

  try { await resolveTmdbId(item); } catch (_) { /* handled below */ }

  const q = encodeURIComponent(`${item.t} ${item.y || ''}`);

  if (!item.id) {
    $('modal-body').innerHTML = `<div class="bd"><h2>${escapeHtml(item.t)}</h2>
      <p class="ov">Couldn’t load details for this one.</p>
      <div class="lk">
        <a target="_blank" rel="noopener" href="https://www.google.com/search?q=${q}+watch+online">Search Google</a>
        <a target="_blank" rel="noopener" href="https://www.justwatch.com/in/search?q=${encodeURIComponent(item.t)}">JustWatch</a>
      </div>${actionsHtml(key)}</div>`;
  } else {
    try {
      const data = await api(`/${item.k}/${item.id}`, {
        append_to_response: 'videos,watch/providers,credits',
        include_video_language: 'en,null,hi,' + (item.lc || 'en'),
      });
      const view = detailsHtml(item, data);
      $('modal-body').innerHTML = view.html;
      bindTrailer(view.trailer, view.youtubeUrl);
    } catch (_) {
      $('modal-body').innerHTML = `<div class="bd"><h2>${escapeHtml(item.t)}</h2><p class="ov">Couldn’t reach TMDB for details.</p>${actionsHtml(key)}</div>`;
    }
  }
  bindActions(item);
}

function closeDetails() {
  if (!$('modal').classList.contains('on')) return;
  $('modal').classList.remove('on');
  $('modal-body').innerHTML = '';
  unlockScroll();
}

/* 9. Events --------------------------------------------------------------- */

function surpriseMe() {
  const cards = [...document.querySelectorAll('.tk')];
  if (!cards.length) return;

  const spinner = $('spinner');
  const pick = () => cards[Math.floor(Math.random() * cards.length)];
  let ticks = 0;
  spinner.hidden = false;

  const timer = setInterval(() => {
    spinner.textContent = '🎞️ ' + pick().getAttribute('aria-label');
    if (++ticks > 12) {
      clearInterval(timer);
      const winner = pick();
      spinner.textContent = '🎬 ' + winner.getAttribute('aria-label');
      openDetails(winner.dataset.k);
    }
  }, 80);
}

function bindEvents() {
  let searchTimer;
  $('search').oninput = (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = e.target.value.trim().toLowerCase(); render(); }, SEARCH_DEBOUNCE_MS);
  };

  $('sort').onchange = (e) => { state.sort = e.target.value; render(); };
  $('region').onchange = (e) => { state.region = e.target.value; writeStorage(STORAGE.region, state.region); };
  $('watchlist-toggle').onclick = () => {
    state.watchlistOnly = !state.watchlistOnly;
    $('watchlist-toggle').setAttribute('aria-pressed', state.watchlistOnly);
    render();
  };
  $('surprise').onclick = surpriseMe;

  $('grid').onclick = (e) => { const card = e.target.closest('.tk'); if (card) openDetails(card.dataset.k); };
  $('modal-close').onclick = closeDetails;
  $('modal').onclick = (e) => { if (e.target === $('modal')) closeDetails(); };
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetails(); });

  // Infinite scroll sentinel
  new IntersectionObserver((e) => { if (e[0].isIntersecting) loadMore(); }, { rootMargin: '700px' }).observe($('more'));
}

/* 10. Init ---------------------------------------------------------------- */

function startLoader() {
  let count = 3;
  const timer = setInterval(() => {
    count--;
    if (count > 0) { $('loader-num').textContent = count; return; }
    clearInterval(timer);
    $('loader').classList.add('off');
  }, 650);
}

function startHeroWords() {
  let i = 0;
  setInterval(() => { $('hero-word').textContent = WORDS[++i % WORDS.length]; }, 3200);
}

function init() {
  detectRegion();
  readStorage();
  curated = loadCurated();

  $('region').innerHTML = REGIONS.map((r) => `<option ${r === state.region ? 'selected' : ''}>${r}</option>`).join('');

  bindEvents();
  paintFilters();
  render();
  startLoader();
  startHeroWords();
}

init();