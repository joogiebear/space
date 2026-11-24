<script setup lang="ts">
import { ui } from '../store';
</script>

<template>
  <div v-show="ui.toast.visible" id="toast">{{ ui.toast.msg }}<small v-if="ui.toast.sub">{{ ui.toast.sub }}</small></div>
</template>
