<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { Loc } from '@/scenes/earth/location';
import { locationRequest } from '../store';

/** "Your location" dialog (prompt() is blocked in embedded browsers). It stays in this browser and is never sent anywhere. */
const NUM = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/;
const text = ref(''), err = ref(''), input = ref<HTMLInputElement | null>(null);

watch(locationRequest, async req => {
  if (!req) return;
  text.value = req.current ? `${req.current.lat}, ${req.current.lon}` : ''; err.value = '';
  await nextTick(); input.value?.focus(); input.value?.select();
});

const close = (loc: Loc | null) => locationRequest.value?.resolve(loc);

function save() {
  const m = text.value.match(NUM);
  if (!m || Math.abs(+m[1]) > 90 || Math.abs(+m[2]) > 180) { err.value = 'Use the form "latitude, longitude", for example 51.5, -0.12'; return; }
  close({ lat: +m[1], lon: +m[2] });
}

function useBrowser() {
  err.value = 'Asking your browser…';
  if (!navigator.geolocation) { err.value = 'This browser has no location support. Enter coordinates instead.'; return; }
  navigator.geolocation.getCurrentPosition(
    p => close({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }),
    () => { err.value = 'Location unavailable (it needs HTTPS or localhost and your permission). Enter coordinates instead.'; },
    { timeout: 10000 });
}

function onKey(e: KeyboardEvent) {
  e.stopPropagation();
  if (e.key === 'Enter') save();
  if (e.key === 'Escape') close(null);
}
</script>

<template>
  <div v-if="locationRequest" class="modal" @click.self="close(null)">
    <div class="panel box">
      <h3>Your location</h3>
      <p>Enter latitude, longitude (south and west are negative), or use your browser's location. It stays in this browser and is never sent anywhere.</p>
      <input ref="input" v-model="text" type="text" placeholder="51.5, -0.12" autocomplete="off" spellcheck="false" @keydown="onKey">
      <div class="err">{{ err }}</div>
      <div class="btns">
        <button @click="useBrowser">Use browser location</button>
        <span />
        <button @click="close(null)">Cancel</button>
        <button class="pri" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>
