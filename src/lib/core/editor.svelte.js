export class Editor {
  #engine;
  #project;

  // Stored in state because AlphaTab emits this rather than storing it as a static property
  activeBeat = $state(null);

  constructor(engine, project) {
    this.#engine = engine;
    this.#project = project;
  }

  initListeners() {
    this.#engine.api.activeBeatsChanged.on((args) => {
      this.activeBeat = args.activeBeats?.[0] || null;
    });
  }

  get score() {
    this.#engine.currentTick;
    return this.#engine.api?.score;
  }

  get tracks() {
    this.#engine.currentTick;
    return this.#engine.api?.score?.tracks || [];
  }

  get settings() {
    this.#engine.currentTick;
    return this.#engine.api?.settings;
  }

  updateScoreField(field, value) {
    if (!this.#engine.api?.score) return;
    this.#engine.api.score[field] = value;
    this.#project.hasUnsavedChanges = true;
    this.#engine.requestUpdate();
  }

  updateSettingsField(group, field, value) {
    if (!this.#engine.api?.settings) return;
    this.#engine.api.settings[group][field] = value;
    this.#engine.api.updateSettings();
    this.#engine.requestUpdate();
  }
}
