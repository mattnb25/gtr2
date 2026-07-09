<script>
  import { onMount, onDestroy } from "svelte";
  import { storeWritable, getState, setState } from "../store.js";
  import { initAlphaTab, destroyAlphaTab, newEmptyScore } from "../lib/atManager.js";
  import { syncSoundFont } from "../lib/soundfont.js";
  import { clearHistory } from "../lib/historyRouter.js";
  import { 
    selectByNote, 
    selectByBeat, 
    clearSelection,
    activeRange,
    collectRangeBeats,
    resolveBeat,
    beatRefFromBeat,
    findBeatAtTick
  } from "../lib/selection.js";
  import { SetScoreInfoCommand } from "../lib/commands/index.js";
  import { execute } from "../lib/historyRouter.js";

  let containerEl;
  let wrapperEl;
  let dragging = false;

  let st = $storeWritable;
  $: st = $storeWritable;

  let renderCount = 0;
  let overlayBounds = null;
  let playerTick = 0;
  let playlineBounds = null;

  // Helper to find the tablature beat bounds (or only bounds if single staff)
  function findTabBeatBounds(api, beat) {
    if (!api || !api.boundsLookup || !beat) return null;
    const all = api.boundsLookup.findBeats(beat);
    if (!all || all.length === 0) return null;
    if (all.length === 1) return all[0];
    
    // Find the one with the largest Y-coordinate (which is always the tablature staff below standard notation)
    let best = all[0];
    for (let i = 1; i < all.length; i++) {
      if (all[i].realBounds.y > best.realBounds.y) {
        best = all[i];
      }
    }
    return best;
  }

  // Sync alphaTab playline cursor with selection when not playing.
  // This also enables automatic scrolling/centering of the active beat!
  $: if (st.api && st.selection && !st.transport?.playing) {
    const beat = resolveBeat(st.api.score, st.selection);
    if (beat) {
      st.api.tickPosition = beat.absolutePlaybackStart;
    }
  }

  // Reactively calculate coordinates for overlays.
  $: {
    const sel = st.selection;
    const anc = st.anchor;
    const str = st.selectedString;
    const api = st.api;
    const _dummy = renderCount; // triggers update when rendering changes

    if (api && api.boundsLookup && api.score) {
      overlayBounds = calculateOverlayBounds(api, sel, anc, str);
    } else {
      overlayBounds = null;
    }
  }

  // Reactively calculate playback cursor position (playline)
  $: if (st.api && st.api.score) {
    if (st.transport?.playing && playerTick >= 0) {
      const beat = findBeatAtTick(st.api.score, st.selection?.trackIndex || 0, playerTick);
      if (beat) {
        const allBounds = st.api.boundsLookup.findBeats(beat);
        if (allBounds && allBounds.length > 0) {
          // Span playline cursor vertically across all staves
          let minY = allBounds[0].realBounds.y;
          let maxY = allBounds[0].realBounds.y + allBounds[0].realBounds.h;
          const onNotesX = allBounds[0].onNotesX;

          for (let i = 1; i < allBounds.length; i++) {
            const b = allBounds[i];
            if (b.realBounds.y < minY) minY = b.realBounds.y;
            const bMaxY = b.realBounds.y + b.realBounds.h;
            if (bMaxY > maxY) maxY = bMaxY;
          }

          playlineBounds = {
            x: onNotesX,
            y: minY - 4,
            h: (maxY - minY) + 8
          };
        } else {
          playlineBounds = null;
        }
      } else {
        playlineBounds = null;
      }
    } else {
      playlineBounds = null;
    }
  }

  function calculateOverlayBounds(api, selection, anchor, selectedString) {
    if (!selection || !api.boundsLookup || !api.score) return null;

    const boundsLookup = api.boundsLookup;
    const score = api.score;

    // 1. Calculate active selected beat(s)
    let selectedBeats = [];
    const range = activeRange();
    if (range) {
      selectedBeats = collectRangeBeats(score, range);
    } else {
      const beat = resolveBeat(score, selection);
      if (beat) selectedBeats = [beat];
    }

    // 2. Generate rects for selection shading (positioned on the tab staff!)
    const selectionRects = [];
    for (const beat of selectedBeats) {
      const beatBounds = findTabBeatBounds(api, beat);
      if (beatBounds) {
        const rb = beatBounds.realBounds;
        const vb = beatBounds.visualBounds;
        if (rb && vb) {
          selectionRects.push({
            x: vb.x - 2,
            y: rb.y - 4,
            w: vb.w + 4,
            h: rb.h + 8
          });
        }
      }
    }

    // 3. Generate rect for selected note heads on the tab!
    const noteRects = [];
    let activeNoteRect = null;
    let ghostLineY = null;
    let ghostLineX = null;
    let ghostLineWidth = null;

    const currentBeat = resolveBeat(score, selection);
    if (currentBeat) {
      const beatBounds = findTabBeatBounds(api, currentBeat);
      if (beatBounds) {
        // Highlight all notes in this beat (chord)
        if (beatBounds.notes) {
          for (const nb of beatBounds.notes) {
            if (nb.note && nb.noteHeadBounds) {
              const rect = {
                x: nb.noteHeadBounds.x,
                y: nb.noteHeadBounds.y,
                w: nb.noteHeadBounds.w,
                h: nb.noteHeadBounds.h,
                string: nb.note.string,
                isActive: nb.note.string === selectedString
              };
              noteRects.push(rect);
              if (nb.note.string === selectedString) {
                activeNoteRect = rect;
              }
            }
          }
        }

        // If there's no note on the selected string, draw the ghost line on the selected string of the tab
        if (!activeNoteRect) {
          const rb = beatBounds.realBounds;
          const vb = beatBounds.visualBounds;
          if (rb && vb) {
            const staff = score.tracks[selection.trackIndex]?.staves[selection.staffIndex];
            const stringCount = staff?.tuning?.length ?? 6;
            
            // Tab lines render top-to-bottom: string 1 at top, string 6 at bottom.
            const stringIdx = selectedString - 1;
            const lineY = rb.y + (stringIdx) * (rb.h / (stringCount - 1));
            
            ghostLineY = lineY;
            ghostLineX = vb.x;
            ghostLineWidth = vb.w;
          }
        }
      }
    }

    return {
      selectionRects,
      noteRects,
      activeNoteRect,
      ghostLineY,
      ghostLineX,
      ghostLineWidth
    };
  }

  function findClosestBeatAndString(api, x, y) {
    if (!api || !api.boundsLookup || !api.boundsLookup.staffSystems) return null;

    const systems = api.boundsLookup.staffSystems;
    if (systems.length === 0) return null;

    // 1. Find closest staff system
    let closestSystem = systems[0];
    let minSysDist = Infinity;
    for (const sys of systems) {
      const rb = sys.realBounds;
      if (!rb) continue;
      let dist = 0;
      if (y < rb.y) {
        dist = rb.y - y;
      } else if (y > rb.y + rb.h) {
        dist = y - (rb.y + rb.h);
      }
      if (dist < minSysDist) {
        minSysDist = dist;
        closestSystem = sys;
      }
    }

    // 2. Find closest master bar in that system
    const bars = closestSystem.bars;
    if (!bars || bars.length === 0) return null;
    let closestBar = bars[0];
    let minBarDist = Infinity;
    for (const bar of bars) {
      const rb = bar.realBounds;
      if (!rb) continue;
      let dist = 0;
      if (x < rb.x) {
        dist = rb.x - x;
      } else if (x > rb.x + rb.w) {
        dist = x - (rb.x + rb.w);
      }
      if (dist < minBarDist) {
        minBarDist = dist;
        closestBar = bar;
      }
    }

    // 3. Find closest beat in that master bar
    let closestBeatBounds = null;
    let minBeatDist = Infinity;
    if (closestBar.bars) {
      for (const bar of closestBar.bars) {
        if (bar.beats) {
          for (const bb of bar.beats) {
            const rb = bb.realBounds;
            if (!rb) continue;
            let dist = 0;
            if (x < rb.x) {
              dist = rb.x - x;
            } else if (x > rb.x + rb.w) {
              dist = x - (rb.x + rb.w);
            }
            if (dist < minBeatDist) {
              minBeatDist = dist;
              closestBeatBounds = bb;
            }
          }
        }
      }
    }

    if (!closestBeatBounds || !closestBeatBounds.beat) return null;
    const beat = closestBeatBounds.beat;

    // 4. Find the tablature staff bounds for this beat
    const tabBeatBounds = findTabBeatBounds(api, beat);
    if (!tabBeatBounds || !tabBeatBounds.realBounds) return null;

    const rb = tabBeatBounds.realBounds;
    const staff = beat.voice.bar.staff;
    const stringCount = staff?.tuning?.length ?? 6;

    // Calculate which string index was clicked
    const relativeY = y - rb.y;
    const clickedStringIdx = Math.round(relativeY / (rb.h / (stringCount - 1)));
    const clickedString = Math.max(1, Math.min(stringCount, clickedStringIdx + 1));

    return {
      beat,
      clickedString
    };
  }

  // Handle clicking anywhere on the tablature staff strings to change selection
  function handleMouseDown(e) {
    if (e.button !== 0) return;
    const api = getState().api;
    if (!api || !api.boundsLookup || !api.score) return;

    // Get coordinates relative to the container element
    const rect = containerEl.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    const result = findClosestBeatAndString(api, relX, relY);
    if (!result) return;

    const { beat, clickedString } = result;

    // Update selection!
    const ref = beatRefFromBeat(beat);
    if (ref) {
      const note = beat.notes?.find(n => n.string === clickedString);
      if (note) {
        selectByNote(note);
      } else {
        setState({
          selection: ref,
          anchor: null,
          selectedString: clickedString
        });
      }
    }
  }

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    handleMouseDown({
      clientX: touch.clientX,
      clientY: touch.clientY,
      button: 0,
      preventDefault: () => e.preventDefault()
    });
  }

  onMount(() => {
    const instance = initAlphaTab(containerEl, wrapperEl, {
      onStateChanged: (playing) => {
        setState({ transport: { ...getState().transport, playing } });
        if (!playing) {
          playerTick = -1;
        }
      },
      onScoreLoaded: () => {
        clearHistory();
        setState({ scoreVersion: 0 });
        syncSoundFont();
      },
      onBeatMouseDown: (beat) => {
        if (!beat) return;
        const firstNote = beat.notes?.[0];
        if (firstNote) selectByNote(firstNote);
        else selectByBeat(beat);
      },
      onNoteMouseDown: (note) => {
        if (!note) return;
        selectByNote(note);
      },
      onError: (e) => console.error("[alphaTab error]", e),
    });

    // Listen to alphaTab render events to update our overlays
    instance.renderFinished.on(() => {
      renderCount = renderCount + 1;
    });

    instance.playerPositionChanged.on((e) => {
      playerTick = e.currentTick;
    });

    setState({ api: instance });
    newEmptyScore(instance);

    containerEl.addEventListener("dragover", onDragOver);
    containerEl.addEventListener("dragleave", onDragLeave);
    containerEl.addEventListener("drop", onDrop);

    return () => {
      containerEl?.removeEventListener("dragover", onDragOver);
      containerEl?.removeEventListener("dragleave", onDragLeave);
      containerEl?.removeEventListener("drop", onDrop);
    };
  });

  onDestroy(() => { destroyAlphaTab(); setState({ api: null }); });

  function onDragOver(e) { e.preventDefault(); dragging = true; }
  function onDragLeave() { dragging = false; }

  async function onDrop(e) {
    e.preventDefault(); dragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (!file || !getState().api) return;
    const buf = await file.arrayBuffer();
    getState().api.load(new Uint8Array(buf));
  }
</script>

<div class="score-area">
  <div class="score-wrapper" bind:this={wrapperEl}>
    {#if dragging}
      <div class="drag-overlay">Drop a Guitar Pro file here</div>
    {/if}
    
    <div class="score-viewport">
      <div class="score-container" bind:this={containerEl} on:mousedown={handleMouseDown} on:touchstart={handleTouchStart}></div>
      
      {#if overlayBounds || playlineBounds}
        <div class="overlay-container">
          <!-- Selection shading blocks -->
          {#if overlayBounds}
            {#each overlayBounds.selectionRects as rect}
              <div 
                class="selection-highlight"
                style="left: {rect.x}px; top: {rect.y}px; width: {rect.w}px; height: {rect.h}px;"
              ></div>
            {/each}

            <!-- Selected note head highlights (for all notes in the chord/beat) -->
            {#each overlayBounds.noteRects as rect}
              <div 
                class="note-highlight"
                class:active={rect.isActive}
                style="left: {rect.x - 3}px; top: {rect.y - 3}px; width: {rect.w + 6}px; height: {rect.h + 6}px;"
              ></div>
            {/each}

            <!-- Ghost line indicator when on a string with no note -->
            {#if !overlayBounds.activeNoteRect && overlayBounds.ghostLineY !== null}
              <div 
                class="ghost-line"
                style="left: {overlayBounds.ghostLineX}px; top: {overlayBounds.ghostLineY - 1.5}px; width: {overlayBounds.ghostLineWidth}px;"
              ></div>
            {/if}
          {/if}

          <!-- Playline Cursor -->
          {#if playlineBounds}
            <div 
              class="playline-cursor"
              style="left: {playlineBounds.x}px; top: {playlineBounds.y}px; height: {playlineBounds.h}px;"
            ></div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .score-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    min-width: 0;
  }
  .score-wrapper {
    flex: 1;
    position: relative;
    overflow-y: auto;
    overflow-x: hidden;
    background: #fcfcfc;
    -webkit-overflow-scrolling: touch;
  }
  .score-viewport {
    position: relative;
    width: 100%;
    min-height: 100%;
  }
  .score-container {
    width: 100%;
    min-height: 100%;
    background: #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  }
  .overlay-container {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 10;
  }
  .selection-highlight {
    position: absolute;
    background: rgba(255, 110, 64, 0.12);
    border-left: 1px solid rgba(255, 110, 64, 0.4);
    border-right: 1px solid rgba(255, 110, 64, 0.4);
    border-radius: 4px;
    transition: all 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
    box-shadow: 0 0 6px rgba(255, 110, 64, 0.05);
  }
  .note-highlight {
    position: absolute;
    border: 1.5px solid rgba(255, 87, 34, 0.5);
    background: rgba(255, 87, 34, 0.08);
    border-radius: 4px;
    transition: all 100ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .note-highlight.active {
    border: 2px solid #ff5722;
    background: rgba(255, 87, 34, 0.18);
    box-shadow: 0 0 10px rgba(255, 87, 34, 0.45), inset 0 0 4px rgba(255, 87, 34, 0.2);
  }
  .ghost-line {
    position: absolute;
    height: 3px;
    background: rgba(255, 87, 34, 0.3);
    border-top: 1px dashed rgba(255, 87, 34, 0.7);
    border-bottom: 1px dashed rgba(255, 87, 34, 0.7);
    transition: all 100ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .playline-cursor {
    position: absolute;
    width: 2.5px;
    background: #ff5722;
    box-shadow: 0 0 10px rgba(255, 87, 34, 0.8), 0 0 4px rgba(255, 87, 34, 0.4);
    border-radius: 1px;
    pointer-events: none;
    z-index: 15;
    opacity: 0.95;
    transition: left 80ms linear;
  }
  .drag-overlay {
    position: absolute; inset: 0;
    background: rgba(74,144,226,.12);
    border: 2px dashed #4a90e2;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; color: #4a90e2;
    z-index: 100; pointer-events: none;
  }
</style>
