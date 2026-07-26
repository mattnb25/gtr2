export class Playback {
  #engine;

  // State
  isPlaying = $state(false);
  isSeeking = $state(false);
  isMetronomeActive = $state(false);
  isCountInActive = $state(false);
  metronomeVol = $state(1.0);
  playbackSpeed = $state(1.0);

  // Position tracking (in ms)
  currentTime = $state(0);
  endTime = $state(0);

  constructor(engine) {
    this.#engine = engine;
  }

  initListeners() {
    if (!this.#engine.api) return;

    this.#engine.api.playerStateChanged.on((e) => {
      this.isPlaying = e.state === 1;
      this.#engine.ping();
    });

    this.#engine.api.playerPositionChanged.on((e) => {
      if (!this.isSeeking) this.currentTime = e.currentTime;
      this.endTime = e.endTime;
      this.#engine.ping();
    });

    this.#engine.api.playerFinished?.on(() => {
      this.isPlaying = false;
      this.currentTime = 0;
      this.#engine.ping();
    });
  }

  toggle() {
    if (this.#engine.api?.isReadyForPlayback) this.#engine.api.playPause();
  }

  syncMetronomeVolume() {
    if (!this.#engine.api) return;
    this.#engine.api.metronomeVolume = this.isMetronomeActive
      ? this.metronomeVol
      : 0;
    this.#engine.api.countInVolume = this.isCountInActive
      ? this.metronomeVol
      : 0;
  }

  toggleMetronome(active) {
    this.isMetronomeActive = active ?? !this.isMetronomeActive;
    this.syncMetronomeVolume();
  }

  toggleCountIn(active) {
    this.isCountInActive = active ?? !this.isCountInActive;
    this.syncMetronomeVolume();
  }

  setMetronomeVol(vol) {
    this.metronomeVol = vol;
    this.syncMetronomeVolume();
  }

  setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;
    if (this.#engine.api) this.#engine.api.playbackSpeed = speed;
  }

  seek(timeMs) {
    this.currentTime = timeMs;
    if (this.#engine.api) {
      this.#engine.api.timePosition = timeMs;
      this.#engine.api.scrollToCursor();
    }
  }
}
