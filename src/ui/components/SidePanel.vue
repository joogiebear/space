<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { select } from '@/engine/selection';
import type { Body, Layer } from '@/types';
import { sceneBodies, sceneLayers, ui } from '../store';

/** Layers (checkboxes) and Objects (select list) for the current scene. */
const checked = ref<boolean[]>([]);
watch(
  sceneLayers,
  ls => {
    checked.value = ls.map(l => l.on);
  },
  { immediate: true },
);

function toggle(L: Layer, i: number) {
  L.on = checked.value[i];
  L.apply(L.on);
}

/** Top-level bodies, each followed by its moons (indented). */
const rows = computed(() => {
  const out: { b: Body; sub: boolean }[] = [];
  for (const b of sceneBodies.value) {
    if (b.parentBody) continue;
    out.push({ b, sub: false });
    for (const m of b.moons || []) out.push({ b: m, sub: true });
  }
  return out;
});
</script>

<template>
  <aside id="side" class="panel" aria-label="Layers and objects">
    <div id="layers">
      <template v-if="sceneLayers.length">
        <h2>Layers</h2>
        <label v-for="(L, i) in sceneLayers" :key="L.id">
          <input v-model="checked[i]" type="checkbox" @change="toggle(L, i)" />
          <i v-if="L.color" :style="{ background: L.color }" aria-hidden="true" />
          {{ L.label }}
          <span v-if="L.count != null">{{ L.count.toLocaleString() }}</span>
        </label>
      </template>
    </div>
    <div>
      <h2>Objects</h2>
      <div id="list">
        <button
          v-for="row in rows"
          :key="row.b.id"
          :class="{ sub: row.sub, sel: ui.selId === row.b.id }"
          :aria-pressed="ui.selId === row.b.id"
          @click="select(row.b)"
        >
          {{ row.b.label }}
        </button>
      </div>
    </div>
  </aside>
</template>
