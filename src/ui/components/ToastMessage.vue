<script setup lang="ts">
import { ui } from '../store';
</script>

<template>
  <!-- spoken through the live region in App.vue, so hidden from screen readers here to avoid saying it twice -->
  <div v-show="ui.toast.visible" id="toast" aria-hidden="true">
    {{ ui.toast.msg }}<small v-if="ui.toast.sub">{{ ui.toast.sub }}</small>
  </div>
</template>
