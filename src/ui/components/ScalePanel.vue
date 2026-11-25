<script setup lang="ts">
import { computed } from 'vue';
import {
  KIND_LABEL,
  LANDMARKS,
  LOG_MAX,
  LOG_MIN,
  SPEEDS,
  fmtDuration,
  fmtSize,
  fmtTimes,
  neighbours,
  nearest,
  powerOfTen,
  scalePos,
  sizeAt,
  travelSeconds,
  type ScaleKind,
} from '@/lib/scale';
import { clampLog, closeScale, pickLandmark, scaleUi, setLog, showLandmark } from '../scaleStore';

/** The scale of the universe: drag one slider from a proton to everything we can see, and read what is there. */
const HUMAN = 1.7;
const size = computed(() => sizeAt(scaleUi.log));
const here = computed(() => nearest(size.value));
const between = computed(() => neighbours(size.value));
const vsHuman = computed(() => {
  const m = size.value;
  if (Math.abs(Math.log10(m / HUMAN)) < 0.06) return 'About the size of a person.';
  return m > HUMAN
    ? `${fmtTimes(m / HUMAN)} a person’s height`.replace(/^./, c => c.toUpperCase()) + '.'
    : `${fmtTimes(HUMAN / m)} smaller than a person`
        .replace(/^./, c => c.toUpperCase())
        .replace('times smaller than', 'times smaller than') + '.';
});
const rows = computed(() =>
  SPEEDS.map(s => ({ id: s.id, label: s.label, text: fmtDuration(travelSeconds(size.value, s.v)) })),
);

const KIND_COLOR: Record<ScaleKind, string> = {
  tiny: '#c78bff',
  life: '#6fe3a5',
  world: '#5ec8ff',
  star: '#ffd36a',
  galaxy: '#ff9a6a',
  cosmos: '#ff7aa8',
};
/** Ruler marks every five powers of ten. */
const ticks = computed(() => {
  const out: { x: number; label: string }[] = [];
  for (let p = Math.ceil(LOG_MIN / 5) * 5; p <= LOG_MAX; p += 5)
    out.push({ x: (p - LOG_MIN) / (LOG_MAX - LOG_MIN), label: powerOfTen(p) });
  return out;
});
const dots = LANDMARKS.map(l => ({ id: l.id, name: l.name, x: scalePos(l.m), color: KIND_COLOR[l.kind] }));
const cursor = computed(() => (scaleUi.log - LOG_MIN) / (LOG_MAX - LOG_MIN));

function onRuler(e: MouseEvent) {
  const r = (e.currentTarget as SVGElement).getBoundingClientRect();
  setLog(LOG_MIN + ((e.clientX - r.left) / r.width) * (LOG_MAX - LOG_MIN));
}
const legend = (Object.keys(KIND_LABEL) as ScaleKind[]).map(k => ({ k, label: KIND_LABEL[k], color: KIND_COLOR[k] }));
</script>

<template>
  <aside v-if="scaleUi.open" id="scale" class="panel" role="dialog" aria-label="Scale of the universe">
    <header>
      <h2>Scale of the universe</h2>
      <button class="x" aria-label="Close the scale" @click="closeScale">Close</button>
    </header>
    <p class="lead">
      Slide from the smallest thing we know to the whole observable universe. Each step is ten times bigger.
    </p>

    <svg class="ruler" viewBox="0 0 1000 70" role="img" aria-label="A ruler of sizes in powers of ten" @click="onRuler">
      <line x1="0" y1="34" x2="1000" y2="34" class="base" />
      <g v-for="t in ticks" :key="t.label">
        <line :x1="t.x * 1000" y1="30" :x2="t.x * 1000" y2="38" class="tick" />
        <text :x="t.x * 1000" y="64" class="tl">{{ t.label }}</text>
      </g>
      <circle v-for="d in dots" :key="d.id" :cx="d.x * 1000" cy="34" r="5" :fill="d.color" class="dot">
        <title>{{ d.name }}</title>
      </circle>
      <path :d="`M${cursor * 1000 - 7} 6 L${cursor * 1000 + 7} 6 L${cursor * 1000} 22 Z`" class="cur" />
    </svg>

    <input
      class="slide"
      type="range"
      aria-label="Size, as a power of ten of a metre"
      :min="LOG_MIN"
      :max="LOG_MAX"
      step="0.01"
      :value="scaleUi.log"
      @input="setLog(clampLog(+($event.target as HTMLInputElement).value))"
    />

    <div class="read">
      <div class="big">{{ powerOfTen(scaleUi.log) }} <small>metres</small></div>
      <div class="size">{{ fmtSize(size) }}</div>
      <p class="rel">{{ vsHuman }}</p>
      <p v-if="between.below && between.above" class="rel">
        Between {{ between.below.name.toLowerCase() }} and {{ between.above.name.toLowerCase() }}.
      </p>
    </div>

    <div class="near">
      <b>{{ here.name }}</b> <span class="sz">{{ fmtSize(here.m) }}</span>
      <p>{{ here.note }}</p>
      <button v-if="here.view" class="go" @click="showLandmark(here)">Show it in the atlas</button>
      <button v-if="Math.abs(Math.log10(here.m) - scaleUi.log) > 0.05" class="go" @click="pickLandmark(here.id)">
        Jump to it
      </button>
    </div>

    <h3>To cross the size on the slider</h3>
    <table class="trip" aria-label="How long it takes to cross this distance">
      <tr v-for="r in rows" :key="r.id">
        <th scope="row">{{ r.label }}</th>
        <td>{{ r.text }}</td>
      </tr>
    </table>

    <div class="legend" aria-hidden="true">
      <span v-for="l in legend" :key="l.k"><i :style="{ background: l.color }"></i>{{ l.label }}</span>
    </div>
  </aside>
</template>
