<script setup lang="ts">
import { computed } from 'vue';
import { goLive, jumpTo, setRate, togglePause } from '@/engine/clock';
import { select } from '@/engine/selection';
import { opts, scene, sim } from '@/engine/state';
import { fmtDate, isoToJD } from '@/lib';
import { scenePresets, ui } from '../store';
import { toast } from '../toast';

/** Speed slider (log scale, 1x to 1e8x), pause/live, label and auto-orbit toggles, and the jump-to-moment menu. */
const rateText = computed(() => {
  const r = ui.rate;
  return r < 1000 ? '×' + Math.round(r)
    : r < 86400 * 365 ? `×${Math.round(r).toLocaleString()}  (${(r / 86400).toFixed(r < 864000 ? 1 : 0)} d/s)`
    : `×${(r / 1e6).toFixed(1)}M  (${(r / 86400 / 365.25).toFixed(1)} yr/s)`;
});

function onSlide(e: Event) {
  const v = +(e.target as HTMLInputElement).value;
  ui.sliderPos = v; sim.live = false;
  setRate(Math.pow(10, v / 100 * 8), true);
}

function onJump(e: Event) {
  const sel = e.target as HTMLSelectElement, p = scenePresets.value[+sel.value];
  sel.value = ''; sel.blur();
  if (!p) return;
  const sc = scene(), jd = isoToJD(p.date);
  jumpTo(jd, p.rate ?? sc.rate ?? 1);
  const b = p.focus ? (sc.bodies || []).find(x => x.id === p.focus) : p.query ? sc.search?.(p.query)?.[0]?.make() : null;
  if (b) select(b);
  toast(p.label, p.note || fmtDate(jd), 7000);
}
</script>

<template>
  <div id="ctl" class="panel">
    <div>
      <div class="top"><span>Time speed</span><span id="rateTxt">{{ rateText }}</span></div>
      <input id="speed" type="range" min="0" max="100" :value="ui.sliderPos" @input="onSlide">
    </div>
    <div class="row">
      <button id="pause" @click="togglePause">{{ ui.paused ? 'Play' : 'Pause' }}</button>
      <button id="live" @click="goLive">Live</button>
      <label><input v-model="opts.labels" type="checkbox"> Labels</label>
      <label><input v-model="opts.autoOrbit" type="checkbox"> Auto-orbit</label>
    </div>
    <select v-show="scenePresets.length" id="jump" aria-label="Jump to a moment in time" @change="onJump">
      <option value="">Jump to a moment in time…</option>
      <option v-for="(p, i) in scenePresets" :key="i" :value="i">{{ p.label }}</option>
    </select>
    <div class="top"><span>{{ ui.timeLabel }}</span><span id="dateTxt">{{ ui.dateText }}</span></div>
  </div>
</template>
