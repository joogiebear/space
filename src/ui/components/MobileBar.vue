<script setup lang="ts">
import { nextTick } from 'vue';
import { focusSearch } from '../searchFocus';
import { ui, type Sheet } from '../store';

/** Bottom bar for phones: one button per panel, and only one panel (a "sheet") open at a time. */
const PANELS: { id: Exclude<Sheet, 'none'>; label: string; controls: string }[] = [
  { id: 'info', label: 'Info', controls: 'info' },
  { id: 'side', label: 'Layers', controls: 'side' },
  { id: 'time', label: 'Time', controls: 'ctl' },
  { id: 'search', label: 'Search', controls: 'search' },
];

async function toggle(id: Exclude<Sheet, 'none'>) {
  ui.sheet = ui.sheet === id ? 'none' : id;
  if (ui.sheet === 'search') {
    await nextTick();
    focusSearch();
  }
}
</script>

<template>
  <nav id="mbar" class="panel" aria-label="Panels">
    <button
      v-for="p in PANELS"
      :key="p.id"
      :aria-expanded="ui.sheet === p.id"
      :aria-controls="p.controls"
      :class="{ on: ui.sheet === p.id }"
      @click="toggle(p.id)"
    >
      {{ p.label }}
    </button>
  </nav>
</template>
