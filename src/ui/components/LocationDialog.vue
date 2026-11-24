<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { Loc } from '@/scenes/earth/location';
import { locationRequest } from '../store';

/** "Your location" dialog (prompt() is blocked in embedded browsers). It stays in this browser and is never sent anywhere. */
const NUM = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/;
const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';
const text = ref(''),
  err = ref(''),
  input = ref<HTMLInputElement | null>(null),
  box = ref<HTMLElement | null>(null);
let opener: HTMLElement | null = null;

watch(locationRequest, async (req, prev) => {
  if (req && !prev) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null; // to hand focus back on close
    text.value = req.current ? `${req.current.lat}, ${req.current.lon}` : '';
    err.value = '';
    await nextTick();
    input.value?.focus();
    input.value?.select();
  } else if (!req && prev) {
    opener?.focus();
    opener = null;
  }
});

const close = (loc: Loc | null) => locationRequest.value?.resolve(loc);

function save() {
  const m = text.value.match(NUM);
  if (!m || Math.abs(+m[1]) > 90 || Math.abs(+m[2]) > 180) {
    err.value = 'Use the form "latitude, longitude", for example 51.5, -0.12';
    return;
  }
  close({ lat: +m[1], lon: +m[2] });
}

function useBrowser() {
  err.value = 'Asking your browser…';
  if (!navigator.geolocation) {
    err.value = 'This browser has no location support. Enter coordinates instead.';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    p => close({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }),
    () => {
      err.value = 'Location unavailable (it needs HTTPS or localhost and your permission). Enter coordinates instead.';
    },
    { timeout: 10000 },
  );
}

/** Esc closes, Enter saves from the field, Tab wraps inside the dialog, and no key leaks to the map's shortcuts. */
function onKey(e: KeyboardEvent) {
  e.stopPropagation();
  if (e.key === 'Escape') {
    e.preventDefault();
    close(null);
  } else if (e.key === 'Enter' && e.target === input.value) {
    e.preventDefault();
    save();
  } else if (e.key === 'Tab' && box.value) {
    const items = [...box.value.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0],
      last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
</script>

<template>
  <div v-if="locationRequest" class="modal" @click.self="close(null)" @keydown="onKey">
    <div
      ref="box"
      class="panel box"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loc-title"
      aria-describedby="loc-desc"
    >
      <h3 id="loc-title">Your location</h3>
      <p id="loc-desc">
        Enter latitude, longitude (south and west are negative), or use your browser's location. It stays in this
        browser and is never sent anywhere.
      </p>
      <input
        ref="input"
        v-model="text"
        type="text"
        aria-label="Latitude and longitude"
        aria-describedby="loc-err"
        placeholder="51.5, -0.12"
        autocomplete="off"
        spellcheck="false"
      />
      <div id="loc-err" class="err" role="alert">{{ err }}</div>
      <div class="btns">
        <button @click="useBrowser">Use browser location</button>
        <span />
        <button @click="close(null)">Cancel</button>
        <button class="pri" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>
