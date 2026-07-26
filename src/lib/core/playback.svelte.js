export class Playback {
  #engine;

  isPlaying = $state(false);

  // Metronome state (Toggle & Vol: 0.0 - 1.0)
  isMetronomeActive = $state(false);
  metronomeVolume = $state(1.0);

  // Count-In state (Toggle & Vol: 0.0 - 1.0)
  isCountInActive = $state(false);
  countInVolume = $state(1.0);

  // Tempo Scale (0.25 - 2.0, default 1.0 = 100%)
  playbackSpeed = $state(1.0);

  // Time & Position tracking (in ms)
  currentTime = $state(0);
  endTime = $state(0);
  isSeeking = $state(false);

  constructor(engine) {
    this.#engine = engine;
  }

  initListeners() {
    const api = this.#engine.api;
    if (!api) return;

    // Synchronize initial API settings
    api.metronomeVolume = this.isMetronomeActive ? this.metronomeVolume : 0;
    api.countInVolume = this.isCountInActive ? this.countInVolume : 0;
    api.playbackSpeed = this.playbackSpeed;

    api.playerStateChanged.on((e) => {
      // 0 = Stopped, 1 = Playing, 2 = Paused
      this.isPlaying = e.state === 1;
      this.#engine.ping();
    });

    api.playerPositionChanged.on((e) => {
      if (!this.isSeeking) {
        this.currentTime = e.currentTime;
      }
      this.endTime = e.endTime;
      this.#engine.ping();
    });

    api.playerFinished?.on(() => {
      this.isPlaying = false;
      this.currentTime = 0;
      this.#engine.ping();
    });
  }

  toggle() {
    const api = this.#engine.api;
    if (!api || !api.isReadyForPlayback) return;
    try {
      api.playPause();
    } catch {
      // Ignore audio node state errors if sound engine is initializing
    }
  }

  stop() {
    const api = this.#engine.api;
    if (!api || !api.isReadyForPlayback) return;
    try {
      api.stop();
    } catch {
      // Ignore audio node state errors
    }
    this.isPlaying = false;
    this.currentTime = 0;
  }

  // Metronome controls
  toggleMetronome() {
    this.isMetronomeActive = !this.isMetronomeActive;
    if (this.#engine.api) {
      this.#engine.api.metronomeVolume = this.isMetronomeActive ? this.metronomeVolume : 0;
    }
  }

  setMetronomeVolume(vol) {
    this.metronomeVolume = vol;
    if (this.isMetronomeActive && this.#engine.api) {
      this.#engine.api.metronomeVolume = vol;
    }
  }

  // Count-In controls
  toggleCountIn() {
    this.isCountInActive = !this.isCountInActive;
    if (this.#engine.api) {
      this.#engine.api.countInVolume = this.isCountInActive ? this.countInVolume : 0;
    }
  }

  setCountInVolume(vol) {
    this.countInVolume = vol;
    if (this.isCountInActive && this.#engine.api) {
      this.#engine.api.countInVolume = vol;
    }
  }

  // Tempo Scale / Playback speed
  setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;
    if (this.#engine.api) {
      this.#engine.api.playbackSpeed = speed;
    }
  }

  // Scrubbable transport position seek
  seek(timeMs) {
    this.currentTime = timeMs;
    if (this.#engine.api) {
      this.#engine.api.timePosition = timeMs;
      this.#engine.api.scrollToCursor();
    }
  }
}
