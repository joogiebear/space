<script setup lang="ts">
import { TABS, chain, goScene, sceneTitle } from '@/engine/sceneManager';
import { ui } from '../store';

/** Breadcrumb trail (click to go up) and the direct-jump tab bar. */
const goUpTo = (id: string, i: number) => { if (i < ui.path.length - 1) goScene(id, { deeper: false }); };
const jumpTo = (id: string) => goScene(id, { deeper: chain(id).length > ui.path.length });
</script>

<template>
  <div id="top" class="panel">
    <div class="r">
      <b>Cosmos Atlas</b>
      <span id="crumbs">
        <template v-for="(id, i) in ui.path" :key="id">
          <button class="crumb" :class="{ cur: i === ui.path.length - 1 }" @click="goUpTo(id, i)">{{ sceneTitle(id) }}</button>
          <span v-if="i < ui.path.length - 1" class="sep">›</span>
        </template>
      </span>
    </div>
    <div id="tabs" class="r">
      <button v-for="[id, label] in TABS" :key="id" class="tab" :class="{ on: ui.sceneId === id }" @click="jumpTo(id)">{{ label }}</button>
    </div>
  </div>
</template>
