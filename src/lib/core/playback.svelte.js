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
      this.#engine.ping();
    });

    api.postRenderFinished.on(() => {
      this.isRendered = true;
      // Scroll the canvas back to the beginning on every new load
      const scrollEl = api.settings?.player?.scrollElement;
      if (scrollEl) scrollEl.scrollTop = 0;
      this.#engine.ping();
    });

    api.playerReady.on(() => {
      this.isPlayerReady = true;
      this.#engine.ping();
    });
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
}
