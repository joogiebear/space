<script setup lang="ts">
import { next, prev, stopTour, toggleAuto } from '@/engine/tour';
import { ui } from '../store';

/** The caption card for a guided tour: what this stop is, with back, play/pause, next and close. */
</script>

<template>
  <section v-if="ui.tour.active" id="tour" class="panel" aria-label="Guided tour">
    <div class="meta">
      <span>{{ ui.tour.tourTitle }}</span>
      <span>{{ ui.tour.index + 1 }} / {{ ui.tour.count }}</span>
    </div>
    <h2>{{ ui.tour.title }}</h2>
    <p>{{ ui.tour.text }}</p>
    <div
      class="bar"
      role="progressbar"
      :aria-valuenow="ui.tour.index + 1"
      aria-valuemin="1"
      :aria-valuemax="ui.tour.count"
    >
      <i :style="{ width: ((ui.tour.index + 1) / ui.tour.count) * 100 + '%' }" />
    </div>
    <div class="btns">
      <button :disabled="ui.tour.index === 0" @click="prev">Back</button>
      <button :aria-pressed="!ui.tour.auto" @click="toggleAuto">{{ ui.tour.auto ? 'Pause' : 'Play' }}</button>
      <button class="pri" @click="next">{{ ui.tour.index === ui.tour.count - 1 ? 'Finish' : 'Next' }}</button>
      <button class="end" aria-label="End the tour" @click="stopTour">Close</button>
    </div>
  </section>
</template>
