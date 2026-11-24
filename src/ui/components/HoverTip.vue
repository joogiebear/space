<script setup lang="ts">
import { ui } from '../store';
</script>

<template>
  <div v-show="ui.tip.visible" id="tip" aria-hidden="true" :style="{ left: ui.tip.x + 'px', top: ui.tip.y + 'px' }">
    {{ ui.tip.text }}
  </div>
</template>
