<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue';
import { select } from '@/engine/selection';
import { scene } from '@/engine/state';
import type { SearchResult } from '@/types';
import { registerSearchInput } from '../searchFocus';
import { ui } from '../store';

/** Per-scene search: each scene's `search(q)` returns the results shown under the box. */
const q = ref(''),
  results = shallowRef<SearchResult[]>([]),
  input = ref<HTMLInputElement | null>(null);

onMounted(() => registerSearchInput(input.value));
watch(
  () => ui.sceneSerial,
  () => reset(),
);

function reset() {
  q.value = '';
  results.value = [];
}

function onInput() {
  const text = q.value.trim().toLowerCase();
  results.value = text.length < 2 ? [] : (scene().search?.(text) ?? []).slice(0, 14);
}

function pick(r: SearchResult) {
  const body = r.make();
  if (body) select(body);
  reset();
}

function onKey(e: KeyboardEvent) {
  e.stopPropagation(); // typing must not trigger the global shortcuts
  if (e.key === 'Escape') {
    reset();
    input.value?.blur();
  }
  if (e.key === 'Enter' && results.value[0]) pick(results.value[0]);
}
</script>

<template>
  <div id="search" class="panel">
    <input
      id="q"
      ref="input"
      v-model="q"
      placeholder="Search this view…  (stars, satellites, planets…)"
      autocomplete="off"
      @input="onInput"
      @keydown="onKey"
    />
    <div id="results" :class="{ open: results.length > 0 }">
      <button v-for="(r, i) in results" :key="i" @click="pick(r)">
        {{ r.label }}<small v-if="r.sub">{{ r.sub }}</small>
      </button>
    </div>
  </div>
</template>
