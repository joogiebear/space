<script setup lang="ts">
import { nextTick, watch } from 'vue';
import { TABS, chain, goScene, sceneTitle } from '@/engine/sceneManager';
import { startTour } from '@/engine/tour';
import { TOURS } from '@/scenes/tours';
import { closeEvents, eventsUi, toggleEvents } from '../eventsStore';
import { closeScale, scaleUi, toggleScale } from '../scaleStore';
import { ui } from '../store';

/** Breadcrumb trail (click to go up) and the direct-jump tab bar. */
const goUpTo = (id: string, i: number) => {
  if (i < ui.path.length - 1) goScene(id, { deeper: false });
};
function onTour(e: Event) {
  const sel = e.target as HTMLSelectElement,
    t = TOURS.find(x => x.id === sel.value);
  sel.value = '';
  sel.blur();
  if (t) startTour(t);
}
// on a phone the tab strip scrolls sideways: keep the current view's tab in sight
watch(
  () => ui.sceneId,
  async () => {
    await nextTick();
    document.querySelector<HTMLElement>('#tabs .tab.on')?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  },
);
const onEvents = () => {
  closeScale();
  toggleEvents();
};
const onScale = () => {
  closeEvents();
  toggleScale();
};
const jumpTo = (id: string) => goScene(id, { deeper: chain(id).length > ui.path.length });
</script>

<template>
  <header id="top" class="panel">
    <h1 class="sr-only">Cosmos Atlas: {{ ui.title }}</h1>
    <div class="r">
      <b aria-hidden="true">Cosmos Atlas</b>
      <nav id="crumbs" aria-label="Breadcrumb">
        <template v-for="(id, i) in ui.path" :key="id">
          <button
            class="crumb"
            :class="{ cur: i === ui.path.length - 1 }"
            :aria-current="i === ui.path.length - 1 ? 'page' : undefined"
            @click="goUpTo(id, i)"
          >
            {{ sceneTitle(id) }}
          </button>
          <span v-if="i < ui.path.length - 1" class="sep" aria-hidden="true">›</span>
        </template>
      </nav>
    </div>
    <nav id="tabs" class="r" aria-label="Views">
      <button
        v-for="[id, label] in TABS"
        :key="id"
        class="tab"
        :class="{ on: ui.sceneId === id }"
        :aria-current="ui.sceneId === id ? 'page' : undefined"
        @click="jumpTo(id)"
      >
        {{ label }}
      </button>
      <button
        id="events-btn"
        class="tab"
        aria-haspopup="dialog"
        :aria-expanded="eventsUi.open"
        title="Eclipses, meteor showers, moon phases, planets and launches"
        @click="onEvents"
      >
        Events
      </button>
      <button
        id="scale-btn"
        class="tab"
        aria-haspopup="dialog"
        :aria-expanded="scaleUi.open"
        title="How big things are, from a proton to the whole universe"
        @click="onScale"
      >
        Scale
      </button>
      <select id="tours" aria-label="Guided tours" @change="onTour">
        <option value="">Guided tours…</option>
        <option v-for="t in TOURS" :key="t.id" :value="t.id" :title="t.blurb">{{ t.title }}</option>
      </select>
    </nav>
  </header>
</template>
