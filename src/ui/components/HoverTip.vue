<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { ui } from '../store';
import { placeTip } from '../tipPlacement';

const el = ref<HTMLElement | null>(null);
const pos = ref({ left: 0, top: 0 });

// keep the tip on screen: measure it, then flip it to the other side of the pointer when it would run off an edge
watch(
  () => [ui.tip.visible, ui.tip.text, ui.tip.sub, ui.tip.x, ui.tip.y] as const,
  async () => {
    pos.value = { left: ui.tip.x, top: ui.tip.y };
    if (!ui.tip.visible) return;
    await nextTick();
    const e = el.value;
    if (!e) return;
    pos.value = placeTip(ui.tip.x, ui.tip.y, e.offsetWidth, e.offsetHeight, window.innerWidth, window.innerHeight);
  },
  { immediate: true },
);
</script>

<template>
  <div
    v-show="ui.tip.visible"
    id="tip"
    ref="el"
    aria-hidden="true"
    :style="{ left: pos.left + 'px', top: pos.top + 'px' }"
  >
    <span class="n">{{ ui.tip.text }}</span>
    <span v-if="ui.tip.sub" class="k">{{ ui.tip.sub }}</span>
  </div>
</template>
