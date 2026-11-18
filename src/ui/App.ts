import type { Game, RunSummary } from '../game/Game';
import type { Action } from '../input/Input';
import type { MissionDef } from '../data/missions';
import type { KeyValueStore } from '../services/Storage';
import type { AudioEngine } from '../audio/Audio';
import { LocalLeaderboard, type Leaderboard } from '../services/Leaderboard';
import { shareScore } from '../services/Share';
import { CONTINUE_COST, buyOutfit, buyUpgrade, defaultProfile, multiplierFor, saveProfile, toggleOutfit, upgradeCost, type Profile } from '../profile/Profile';
import { OUTFITS, PACKS } from '../data/wardrobe';
import { POWER_KINDS, POWER_NAMES, powerDuration } from '../powerups/PowerUps';
import { CONFIG } from '../config';
import { POWER_ICONS } from './Hud';
import { COIN_ICON, MENU_ICONS, OUTFIT_ICONS, TOKEN_ICON, bonesFace, chaseScene, jackFace, museumScene, spottedScene, teapot, yourTurnScene } from './art';

type Screen = 'title' | 'intro' | 'shop' | 'missions' | 'settings' | 'pause' | 'continue' | 'casefile' | 'none';

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const fmt = (n: number): string => Math.floor(n).toLocaleString('en-GB');

const STORY = [
  { art: museumScene, text: 'One foggy night, a cheeky ginger tomcat called Marmalade Jack tiptoed into the Museum of Marvellous Teapots… and pinched the Golden Teapot!' },
  { art: spottedScene, text: 'But Inspector Hemlock Bones was on the case. He peered through his giant magnifying glass and gasped: "I spy a rascal!"' },
  { art: chaseScene, text: 'Off went Jack, legging it through the streets of London, with the Inspector puffing along behind!' },
  { art: yourTurnScene, text: 'Help Jack dodge the buses, grab the coins and keep one step ahead. Swipe (or use the arrow keys) to run!' },
];

const POWER_BLURB: Record<string, string> = {
  helicopter: 'Fly over the traffic',
  spring: 'Super-high jumps',
  brolly: 'Floaty glides',
  magnet: 'Pulls in coins',
  helmet: 'Takes one knock',
  cabDash: 'Smash through barriers',
  teaTime: 'Slows time down',
  corgi: 'Barks Bones back',
};

/**
 * All menus and overlays: title book, storybook intro, shop/wardrobe, missions,
 * settings, pause, the second-chance offer and the Case File. Plain DOM so it is
 * light to load and scales with the screen (phones, tablets, desktop).
 */
export class App {
  private readonly root: HTMLDivElement;
  private screen: Screen = 'none';
  private shopTab: 'wardrobe' | 'upgrades' = 'wardrobe';
  private continueTimer = 0;
  private continueHandle = 0;
  private lastSummary: RunSummary | null = null;
  private lastRank = 0;
  private readonly leaderboard: Leaderboard;
  private saveQueued = false;

  constructor(
    private readonly game: Game,
    private readonly store: KeyValueStore,
    uiRoot: HTMLElement,
    private readonly audio: AudioEngine | null = null,
  ) {
    audio?.setVolumes(game.profile.settings.music, game.profile.settings.sfx);
    this.leaderboard = new LocalLeaderboard(store);
    this.root = document.createElement('div');
    this.root.className = 'ui';
    uiRoot.appendChild(this.root);
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('input', this.onInput);

    game.hooks = {
      onPause: () => this.show('pause'),
      onCatchEnd: (can) => (can ? this.show('continue') : game.endRun()),
      onRunEnd: (s) => this.onRunEnd(s),
      onMission: (m: MissionDef) => this.onMission(m),
      onMenuAction: (a) => this.onMenuAction(a),
      persist: () => this.persist(),
    };

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ['shop', 'missions', 'settings'].includes(this.screen)) {
        e.preventDefault();
        this.show('title');
      }
    });

    this.show(this.profile.introSeen ? 'title' : 'intro');
  }

  private get profile(): Profile {
    return this.game.profile;
  }

  /** Save soon (coalesces bursts of changes into one write). */
  persist(): void {
    if (this.saveQueued) return;
    this.saveQueued = true;
    queueMicrotask(() => {
      this.saveQueued = false;
      void saveProfile(this.store, this.profile);
    });
  }

  // ---------------- screen switching ----------------

  show(screen: Screen): void {
    this.screen = screen;
    this.game.player.showcase = screen === 'shop';
    window.clearInterval(this.continueHandle);
    this.root.className = `ui ui-${screen}`;
    // Gentle menu music on the title and menus; the run music starts with the run.
    if (screen !== 'none' && screen !== 'pause' && screen !== 'continue' && this.game.state !== 'paused') this.audio?.setMusic('menu');
    switch (screen) {
      case 'title':
        this.root.innerHTML = this.titleHtml();
        break;
      case 'intro':
        this.root.innerHTML = this.introHtml(0);
        break;
      case 'shop':
        this.root.innerHTML = this.shopHtml();
        break;
      case 'missions':
        this.root.innerHTML = this.missionsHtml();
        break;
      case 'settings':
        this.root.innerHTML = this.settingsHtml();
        break;
      case 'pause':
        this.root.innerHTML = this.pauseHtml();
        break;
      case 'continue':
        this.startContinueCountdown();
        break;
      case 'casefile':
        this.root.innerHTML = this.caseFileHtml();
        break;
      case 'none':
        this.root.innerHTML = '';
        break;
    }
    // Move keyboard focus to the main button for keyboard and switch users.
    (this.root.querySelector('[data-autofocus]') as HTMLElement | null)?.focus({ preventScroll: true });
  }

  private play(): void {
    this.show('none');
    if (this.game.state === 'ready') this.game.start();
    else this.game.restart();
  }

  // ---------------- events ----------------

  private onClick = (e: MouseEvent): void => {
    const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!el) return;
    const act = el.dataset.act!;
    const arg = el.dataset.arg ?? '';
    this.audio?.click();
    switch (act) {
      case 'play':
        this.play();
        break;
      case 'shop':
      case 'missions':
      case 'settings':
        this.show(act);
        break;
      case 'home':
        if (this.game.state === 'paused' || this.game.state === 'gameover') this.game.quitToTitle();
        this.show('title');
        break;
      case 'back':
        this.show(this.game.state === 'paused' ? 'pause' : 'title');
        break;
      case 'resume':
        this.show('none');
        this.game.resume();
        break;
      case 'intro-next':
        this.turnPage(Number(arg));
        break;
      case 'intro-skip':
        this.finishIntro();
        break;
      case 'story':
        this.show('intro');
        break;
      case 'tab':
        this.shopTab = arg as 'wardrobe' | 'upgrades';
        this.show('shop');
        break;
      case 'buy': {
        const r = buyOutfit(this.profile, arg);
        if (r === 'ok') {
          this.game.player.setOutfit(this.profile.equipped);
          this.persist();
        }
        this.show('shop');
        if (r === 'poor') this.flash('Not enough coins yet: keep running!');
        break;
      }
      case 'wear':
        toggleOutfit(this.profile, arg);
        this.game.player.setOutfit(this.profile.equipped);
        this.persist();
        this.show('shop');
        break;
      case 'upgrade': {
        const r = buyUpgrade(this.profile, arg as (typeof POWER_KINDS)[number]);
        if (r === 'ok') this.persist();
        this.show('shop');
        if (r === 'poor') this.flash('Not enough coins yet: keep running!');
        break;
      }
      case 'continue-yes':
        window.clearInterval(this.continueHandle);
        this.show('none');
        this.game.continueRun();
        break;
      case 'continue-no':
        window.clearInterval(this.continueHandle);
        this.game.endRun();
        break;
      case 'again':
        this.show('none');
        this.game.restart();
        break;
      case 'share':
        if (this.lastSummary) {
          void shareScore(this.lastSummary.score, this.lastSummary.distance).then((r) => {
            if (r === 'copied') this.flash('Copied! Paste it to your friends.');
          });
        }
        break;
      case 'reset':
        if (window.confirm('Start over? This clears your coins, outfits, missions and best score.')) {
          Object.assign(this.profile, defaultProfile(), { introSeen: true });
          this.game.quitToTitle();
          this.persist();
          this.show('settings');
        }
        break;
    }
  };

  private onInput = (e: Event): void => {
    const el = e.target as HTMLInputElement;
    const s = this.profile.settings;
    switch (el.name) {
      case 'music':
        s.music = Number(el.value) / 100;
        break;
      case 'sfx':
        s.sfx = Number(el.value) / 100;
        break;
      case 'reducedMotion':
        s.reducedMotion = el.checked;
        break;
      case 'colourBlind':
        s.colourBlind = el.checked;
        break;
      case 'vibration':
        s.vibration = el.checked;
        break;
      default:
        return;
    }
    this.game.applySettings();
    this.audio?.setVolumes(s.music, s.sfx);
    this.persist();
  };

  /** Keyboard/tap input that reaches the game while a menu is up. */
  private onMenuAction(a: Action): void {
    const go = a === 'jump' || a === 'tap';
    switch (this.screen) {
      case 'title':
        if (go) this.play();
        break;
      case 'intro':
        if (go) this.turnPage(this.currentPage() + 1);
        break;
      case 'pause':
        if (a === 'pause' || go) {
          this.show('none');
          this.game.resume();
        }
        break;
      case 'casefile':
        if (a === 'jump') {
          this.show('none');
          this.game.restart();
        }
        break;
      default:
        break;
    }
  }

  private onMission(m: MissionDef): void {
    void m;
    this.persist();
  }

  private async onRunEnd(s: RunSummary): Promise<void> {
    this.lastSummary = s;
    this.lastRank = await this.leaderboard.submit({ score: s.score, distance: s.distance, date: new Date().toISOString() });
    this.show('casefile');
  }

  private flash(text: string): void {
    this.game.hud.toast(text, 2);
  }

  // ---------------- intro ----------------

  private currentPage(): number {
    return Number(this.root.querySelector('.story')?.getAttribute('data-page') ?? 0);
  }

  private turnPage(n: number): void {
    if (n >= STORY.length) return this.finishIntro();
    const book = this.root.querySelector('.story') as HTMLElement | null;
    if (!book) return;
    book.classList.remove('story-turn');
    void book.offsetWidth;
    book.classList.add('story-turn');
    book.setAttribute('data-page', String(n));
    const page = STORY[n];
    (book.querySelector('.story-art') as HTMLElement).innerHTML = page.art();
    (book.querySelector('.story-text') as HTMLElement).textContent = page.text;
    (book.querySelector('.story-num') as HTMLElement).textContent = `${n + 1} / ${STORY.length}`;
    const next = book.querySelector('[data-act="intro-next"]') as HTMLElement;
    next.dataset.arg = String(n + 1);
    next.textContent = n === STORY.length - 1 ? "Let's go!" : 'Turn the page';
  }

  private finishIntro(): void {
    if (!this.profile.introSeen) {
      this.profile.introSeen = true;
      this.persist();
    }
    this.show('title');
  }

  private introHtml(n: number): string {
    const page = STORY[n];
    return `
      <div class="story" data-page="${n}" role="dialog" aria-label="The story so far">
        <div class="story-page">
          <div class="story-art">${page.art()}</div>
          <p class="story-text">${esc(page.text)}</p>
          <div class="story-foot">
            <span class="story-num">${n + 1} / ${STORY.length}</span>
            <button class="btn btn-go" data-act="intro-next" data-arg="${n + 1}" data-autofocus>Turn the page</button>
          </div>
        </div>
        <button class="btn btn-small story-skip" data-act="intro-skip">Skip</button>
      </div>`;
  }

  // ---------------- title ----------------

  private wallet(): string {
    return `<div class="ui-wallet">
      <span class="ui-chip">${COIN_ICON}<b>${fmt(this.profile.coins)}</b></span>
      <span class="ui-chip">${TOKEN_ICON}<b>${fmt(this.profile.tokens)}</b></span>
    </div>`;
  }

  private titleHtml(): string {
    const p = this.profile;
    return `
      ${this.wallet()}
      <div class="title">
        <div class="book" aria-hidden="true">
          <div class="book-page book-left">
            <h1>The Great<br/>London<br/>Getaway</h1>
            <p class="book-sub">A storybook chase across London</p>
          </div>
          <div class="book-page book-right">
            <svg viewBox="-60 -70 120 130">${jackFace(0, -10, 0.95, true)}${teapot(30, 34, 0.55)}</svg>
          </div>
          <div class="book-flip"></div>
        </div>
        <h1 class="sr-only">The Great London Getaway</h1>
        <button class="btn btn-play" data-act="play" data-autofocus>Play</button>
        <div class="title-row">
          <button class="btn btn-icon" data-act="shop">${MENU_ICONS.shop}Shop</button>
          <button class="btn btn-icon" data-act="missions">${MENU_ICONS.missions}Missions</button>
          <button class="btn btn-icon" data-act="settings">${MENU_ICONS.settings}Settings</button>
        </div>
        <p class="title-best">Best score <b>${fmt(p.best)}</b> · Multiplier <b>×${multiplierFor(p)}</b></p>
      </div>`;
  }

  // ---------------- shop ----------------

  private shopHtml(): string {
    const p = this.profile;
    const wardrobe = OUTFITS.map((o) => {
      const owned = p.owned.includes(o.id);
      const worn = p.equipped[o.slot] === o.id;
      const btn = owned
        ? `<button class="btn btn-small ${worn ? 'btn-on' : ''}" data-act="wear" data-arg="${o.id}">${worn ? 'Wearing ✓' : 'Wear'}</button>`
        : `<button class="btn btn-small btn-buy" data-act="buy" data-arg="${o.id}" ${p.coins < o.price ? 'aria-disabled="true"' : ''}>${COIN_ICON}${fmt(o.price)}</button>`;
      return `<li class="card"><div class="card-icon">${OUTFIT_ICONS[o.id] ?? ''}</div><div class="card-body"><b>${esc(o.name)}</b><span>${esc(o.description)}</span></div>${btn}</li>`;
    }).join('');
    const packs = PACKS.map(
      (k) => `<li class="card card-soon"><div class="card-icon">${OUTFIT_ICONS.pack}</div><div class="card-body"><b>${esc(k.name)}</b><span>${esc(k.description)}</span></div><span class="soon">Coming soon</span></li>`,
    ).join('');
    const upgrades = POWER_KINDS.map((k) => {
      const level = p.upgrades[k] ?? 0;
      const max = level >= CONFIG.powerups.maxLevel;
      const cost = upgradeCost(level);
      const pips = Array.from({ length: CONFIG.powerups.maxLevel }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
      return `<li class="card"><div class="card-icon card-power"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${POWER_ICONS[k]}</svg></div>
        <div class="card-body"><b>${POWER_NAMES[k]}</b><span>${POWER_BLURB[k]} · ${powerDuration(k, level).toFixed(1)} s</span><div class="pips" aria-label="Level ${level} of ${CONFIG.powerups.maxLevel}">${pips}</div></div>
        ${max ? '<span class="soon">Max!</span>' : `<button class="btn btn-small btn-buy" data-act="upgrade" data-arg="${k}" ${p.coins < cost ? 'aria-disabled="true"' : ''}>${COIN_ICON}${fmt(cost)}</button>`}</li>`;
    }).join('');
    return `
      ${this.wallet()}
      <section class="panel panel-shop" role="dialog" aria-label="Shop">
        <header class="panel-head"><h2>Shop</h2><button class="btn btn-small" data-act="back" data-autofocus>Done</button></header>
        <div class="tabs" role="tablist">
          <button class="tab ${this.shopTab === 'wardrobe' ? 'tab-on' : ''}" role="tab" data-act="tab" data-arg="wardrobe">Wardrobe</button>
          <button class="tab ${this.shopTab === 'upgrades' ? 'tab-on' : ''}" role="tab" data-act="tab" data-arg="upgrades">Upgrades</button>
        </div>
        <ul class="cards">${this.shopTab === 'wardrobe' ? wardrobe + packs : upgrades}</ul>
      </section>`;
  }

  // ---------------- missions ----------------

  private missionsHtml(): string {
    const t = this.game.missions;
    const p = this.profile;
    const rows = t.set
      .map((m) => {
        const prog = t.progress(m, null);
        const done = t.isDone(m);
        return `<li class="mission ${done ? 'mission-done' : ''}">
          <span class="mission-tick" aria-hidden="true">${done ? '✓' : ''}</span>
          <div class="mission-body"><b>${esc(m.text)}</b>${m.scope === 'run' ? '<em>in one run</em>' : ''}
            <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${m.target}" aria-valuenow="${prog}"><i style="width:${(prog / m.target) * 100}%"></i></div>
          </div>
          <span class="mission-num">${fmt(prog)} / ${fmt(m.target)}</span>
        </li>`;
      })
      .join('');
    return `
      ${this.wallet()}
      <section class="panel" role="dialog" aria-label="Missions">
        <header class="panel-head"><h2>Missions</h2><button class="btn btn-small" data-act="back" data-autofocus>Done</button></header>
        <p class="panel-note">Finish all three to raise your score multiplier. You're on <b>×${multiplierFor(p)}</b>. Set ${p.missions.setIndex + 1}.</p>
        <ul class="missions">${rows}</ul>
      </section>`;
  }

  // ---------------- settings ----------------

  private settingsHtml(): string {
    const s = this.profile.settings;
    return `
      <section class="panel" role="dialog" aria-label="Settings">
        <header class="panel-head"><h2>Settings</h2><button class="btn btn-small" data-act="back" data-autofocus>Done</button></header>
        <label class="setting"><span>Music</span><input type="range" name="music" min="0" max="100" value="${Math.round(s.music * 100)}"/></label>
        <label class="setting"><span>Sound effects</span><input type="range" name="sfx" min="0" max="100" value="${Math.round(s.sfx * 100)}"/></label>
        <label class="setting setting-toggle"><span>Reduced motion<em>No screen shake or bouncy menus</em></span><input type="checkbox" name="reducedMotion" ${s.reducedMotion ? 'checked' : ''}/></label>
        <label class="setting setting-toggle"><span>Colour-blind friendly<em>Clearer colours and labels</em></span><input type="checkbox" name="colourBlind" ${s.colourBlind ? 'checked' : ''}/></label>
        ${'vibrate' in navigator ? `<label class="setting setting-toggle"><span>Vibration<em>A little buzz when Jack bumps into things</em></span><input type="checkbox" name="vibration" ${s.vibration ? 'checked' : ''}/></label>` : ''}
        <div class="setting-row">
          <button class="btn btn-small" data-act="story">Read the story again</button>
          ${this.game.state === 'paused' ? '' : '<button class="btn btn-small btn-danger" data-act="reset">Start over</button>'}
        </div>
        <p class="panel-note small">Controls: swipe, or arrow keys / WASD. Space to jump, Esc to pause.</p>
      </section>`;
  }

  // ---------------- pause ----------------

  private pauseHtml(): string {
    return `
      <section class="panel panel-small" role="dialog" aria-label="Paused">
        <h2>Paused</h2>
        <button class="btn btn-play" data-act="resume" data-autofocus>Carry on</button>
        <div class="title-row">
          <button class="btn btn-small" data-act="settings">Settings</button>
          <button class="btn btn-small" data-act="home">Quit to title</button>
        </div>
      </section>`;
  }

  // ---------------- second chance ----------------

  private startContinueCountdown(): void {
    this.continueTimer = 5;
    const render = () => {
      this.root.innerHTML = `
        <section class="panel panel-small panel-continue" role="dialog" aria-label="Second chance">
          <h2>Wriggle free?</h2>
          <p>Spend <b>${CONTINUE_COST}</b> ${TOKEN_ICON} Teapot Token to escape and keep running.</p>
          <p class="panel-note">You have <b>${fmt(this.game.tokensAvailable)}</b>.</p>
          <div class="countdown" style="--t:${this.continueTimer / 5}"><span>${Math.ceil(this.continueTimer)}</span></div>
          <button class="btn btn-play" data-act="continue-yes" data-autofocus>Escape!</button>
          <button class="btn btn-small" data-act="continue-no">No thanks</button>
        </section>`;
      (this.root.querySelector('[data-autofocus]') as HTMLElement | null)?.focus({ preventScroll: true });
    };
    render();
    this.continueHandle = window.setInterval(() => {
      this.continueTimer -= 1;
      if (this.continueTimer <= 0) {
        window.clearInterval(this.continueHandle);
        this.game.endRun();
        return;
      }
      const c = this.root.querySelector('.countdown') as HTMLElement | null;
      if (c) {
        c.style.setProperty('--t', String(this.continueTimer / 5));
        c.firstElementChild!.textContent = String(Math.ceil(this.continueTimer));
      }
    }, 1000);
  }

  // ---------------- Case File ----------------

  private caseFileHtml(): string {
    const s = this.lastSummary!;
    const p = this.profile;
    const t = this.game.missions;
    // Single-run missions show how far this run got; totals are already banked.
    const missions = t.set
      .map((m) => {
        const prog = t.progress(m, m.scope === 'run' ? this.game.stats : null);
        return `<li class="${t.isDone(m) ? 'done' : ''}">${t.isDone(m) ? '✓' : '○'} ${esc(m.text)} <em>${fmt(prog)}/${fmt(m.target)}</em></li>`;
      })
      .join('');
    const reason = s.reason === 'crash' ? 'Ran smack into trouble' : 'Stumbled once too often';
    return `
      <section class="casefile" role="dialog" aria-label="Case File">
        <div class="casefile-tab">Case File No. 221</div>
        <div class="casefile-paper">
          <div class="casefile-head">
            <svg viewBox="-55 -60 110 110" aria-hidden="true">${bonesFace(0, 0, 0.95)}</svg>
            <div><h2>Inspector Bones reports…</h2><p>${reason} after <b>${fmt(s.distance)} m</b>.</p></div>
            <div class="casefile-stamp" aria-hidden="true">CAUGHT!</div>
          </div>
          <dl class="casefile-stats">
            <dt>Score</dt><dd>${fmt(s.score)}${s.newBest ? ' <span class="best">New best!</span>' : ''}</dd>
            <dt>Best</dt><dd>${fmt(s.best)}</dd>
            <dt>Coins</dt><dd>+${fmt(s.coins)} <small>(${fmt(p.coins)} saved)</small></dd>
            <dt>Teapot Tokens</dt><dd>+${fmt(s.tokens)} <small>(${fmt(p.tokens)} saved)</small></dd>
            <dt>Multiplier</dt><dd>×${s.multiplier}${s.setCompleted ? ` <span class="best">→ ×${multiplierFor(p)} next run!</span>` : ''}</dd>
          </dl>
          ${this.lastRank > 0 && this.lastRank <= 3 && p.totals.runs > 1 ? `<p class="casefile-rank">That's your #${this.lastRank} best run!</p>` : ''}
          <div class="casefile-fact"><b>Did you know?</b> ${esc(s.fact)}</div>
          <ul class="casefile-missions">${missions}</ul>
        </div>
        <div class="casefile-actions">
          <button class="btn btn-play" data-act="again" data-autofocus>Run again</button>
          <button class="btn btn-small" data-act="share">Share</button>
          <button class="btn btn-small" data-act="home">Home</button>
        </div>
      </section>`;
  }
}
