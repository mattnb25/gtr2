export class Playback {
  #engine;
  isPlaying = $state(false);

  constructor(engine) {
    this.#engine = engine;
  }

  initListeners() {
    this.#engine.api?.playerStateChanged.on((e) => {
      this.isPlaying = e.state === 1;
    });
  }

  toggle() {
    this.#engine.api?.playPause();
  }
}
