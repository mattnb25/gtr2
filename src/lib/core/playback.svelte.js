export class Playback {
  #engine;

  isPlaying = $state(false);
  isSeeking = $state(false);
  isRendered = $state(false);
  isPlayerReady = $state(false);
  currentTime = $state(0);
  endTime = $state(0);
  playbackSpeed = $state(1.0);
  metronomeVol = $state(1.0);
  isMetronomeActive = $state(false);
  isCountInActive = $state(false);
  loopStartBar = $state(1);
  loopEndBar = $state(1);
  isLooping = $state(false);

  // Whether the scroll-to-top on render has already been applied for the
  // current score. Prevents edit re-renders from yanking the view back up.
  #scrollResetDone = $state(false);

  constructor(engine) {
    this.#engine = engine;
  }

  initListeners() {
    const api = this.#engine.api;

    api.playerStateChanged.on((e) => {
      this.isPlaying = e.state === 1;
      this.#engine.ping();
    });

    api.playerPositionChanged.on((e) => {
      if (!this.isSeeking) this.currentTime = e.currentTime;
      this.endTime = e.endTime;
      this.#engine.ping();
    });

    api.playerFinished.on(() => {
      this.isPlaying = false;
      this.currentTime = 0;
      this.#engine.ping();
    });

    api.scoreLoaded.on(() => {
      this.currentTime = 0;
      this.endTime = 0;
      this.isPlaying = false;
      this.isRendered = false;
      this.isLooping = false;
      this.loopStartBar = 1;
      this.loopEndBar = 1;
      this.#scrollResetDone = false;
      this.#engine.ping();
    });

    api.postRenderFinished.on(() => {
      this.isRendered = true;
      if (!this.#scrollResetDone) {
        this.#scrollResetDone = true;
        const scrollEl = api.settings?.player?.scrollElement;
        if (scrollEl) scrollEl.scrollTop = 0;
      }
      this.#engine.ping();
    });

    api.playerReady.on(() => {
      this.isPlayerReady = true;
      this.syncToApi();
      this.#engine.ping();
    });
  }

  syncToApi() {
    if (!this.#engine.api) return;
    this.#engine.api.playbackSpeed = this.playbackSpeed;
    this.syncMetronomeVolume();
  }

  toggle() {
    this.#engine.api.playPause();
  }

  seek(timeMs) {
    this.isSeeking = false;
    this.currentTime = timeMs;
    this.#engine.api.timePosition = timeMs;
    this.#engine.api.scrollToCursor();
  }

  setSpeed(speed) {
    this.playbackSpeed = speed;
    this.#engine.api.playbackSpeed = speed;
  }

  toggleMetronome(on) {
    this.isMetronomeActive = on ?? !this.isMetronomeActive;
    this.syncMetronomeVolume();
  }

  toggleCountIn(on) {
    this.isCountInActive = on ?? !this.isCountInActive;
    this.syncMetronomeVolume();
  }

  setMetronomeVol(vol) {
    this.metronomeVol = vol;
    this.syncMetronomeVolume();
  }

  syncMetronomeVolume() {
    this.#engine.api.metronomeVolume = this.isMetronomeActive
      ? this.metronomeVol
      : 0;
    this.#engine.api.countInVolume = this.isCountInActive
      ? this.metronomeVol
      : 0;
  }

  // Loops a bar range [startBar, endBar] (1-based, inclusive) for practice.
  setLoop(startBar, endBar) {
    const score = this.#engine.api?.score;
    if (!score?.masterBars?.length) return;
    const count = score.masterBars.length;
    startBar = Math.max(1, Math.min(Math.round(startBar), count));
    endBar = Math.max(startBar, Math.min(Math.round(endBar), count));

    let startTick = 0;
    for (let i = 0; i < startBar - 1; i++) startTick += score.masterBars[i].calculateDuration();
    let endTick = startTick;
    for (let i = startBar - 1; i < endBar; i++) endTick += score.masterBars[i].calculateDuration();

    this.loopStartBar = startBar;
    this.loopEndBar = endBar;
    this.isLooping = true;
    this.#engine.api.playbackRange = { startTick, endTick };
    this.#engine.api.isLooping = true;
    this.#engine.ping();
  }

  toggleLoop(on) {
    if (on ?? !this.isLooping) {
      this.setLoop(this.loopStartBar, this.loopEndBar);
    } else {
      this.isLooping = false;
      this.#engine.api.isLooping = false;
      this.#engine.api.playbackRange = null;
      this.#engine.ping();
    }
  }
}
