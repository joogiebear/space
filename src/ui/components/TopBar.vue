<script setup lang="ts">
import { TABS, chain, goScene, sceneTitle } from '@/engine/sceneManager';
import { startTour } from '@/engine/tour';
import { TOURS } from '@/scenes/tours';
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
      <select id="tours" aria-label="Guided tours" @change="onTour">
        <option value="">Guided tours…</option>
        <option v-for="t in TOURS" :key="t.id" :value="t.id" :title="t.blurb">{{ t.title }}</option>
      </select>
    </nav>
  </header>
</template>
