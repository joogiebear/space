<script setup lang="ts">
import { computed } from 'vue';
import { KIND_LABEL, type AstroEvent, type EventKind } from '@/lib/events';
import { jdToDate, nowJD } from '@/lib';
import { KINDS, MONTH_CHOICES, closeEvents, eventsUi, setKind, setMonths, showEvent } from '../eventsStore';

/** The astronomy calendar: what is coming up, filterable, and each event opens its place in the atlas. */
/** The event's time rounded to the minute, so an event at 10:00 is not shown as 09:59 by a floating-point crumb. */
const at = (e: AstroEvent) => new Date(Math.round(jdToDate(e.jd).getTime() / 60000) * 60000);
const monthKey = (e: AstroEvent) => {
  const d = at(e);
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
};
const groups = computed(() => {
  const out: { month: string; events: AstroEvent[] }[] = [];
  for (const e of eventsUi.events) {
    const m = monthKey(e);
    if (!out.length || out[out.length - 1].month !== m) out.push({ month: m, events: [] });
    out[out.length - 1].events.push(e);
  }
  return out;
});

const dayText = (e: AstroEvent) => at(e).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
const timeText = (e: AstroEvent) => at(e).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const utcText = (e: AstroEvent) => at(e).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
function inWords(e: AstroEvent) {
  const h = (e.jd - nowJD()) * 24;
  if (h < 0) return 'just happened';
  if (h < 1) return `in ${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `in ${Math.round(h)} h`;
  return `in ${Math.round(h / 24)} days`;
}
const countText = (k: EventKind) => eventsUi.events.filter(e => e.kind === k).length;
</script>

<template>
  <aside v-if="eventsUi.open" id="events" class="panel" role="dialog" aria-label="Astronomy calendar">
    <header>
      <h2>Astronomy calendar</h2>
      <select
        aria-label="How far ahead"
        :value="eventsUi.months"
        @change="setMonths(+($event.target as HTMLSelectElement).value)"
      >
        <option v-for="m in MONTH_CHOICES" :key="m" :value="m">Next {{ m === 36 ? '3 years' : m + ' months' }}</option>
      </select>
      <button class="x" aria-label="Close the calendar" @click="closeEvents">Close</button>
    </header>

    <div class="chips" role="group" aria-label="Kinds of event">
      <label v-for="k in KINDS" :key="k" :class="{ on: eventsUi.kinds[k] }">
        <input
          type="checkbox"
          :checked="eventsUi.kinds[k]"
          @change="setKind(k, ($event.target as HTMLInputElement).checked)"
        />
        {{ KIND_LABEL[k] }}<span v-if="eventsUi.kinds[k] && !eventsUi.busy" class="n">{{ countText(k) }}</span>
      </label>
    </div>

    <p v-if="eventsUi.launchNote" class="note">{{ eventsUi.launchNote }}</p>
    <p v-if="eventsUi.busy" class="note" role="status">Working out the dates…</p>

    <div class="list">
      <section v-for="g in groups" :key="g.month" :aria-label="g.month">
        <h3>{{ g.month }}</h3>
        <ul>
          <li v-for="e in g.events" :key="e.id">
            <component
              :is="e.view ? 'button' : 'div'"
              class="ev"
              :class="[e.kind, { act: e.view }]"
              :title="utcText(e)"
              @click="e.view && showEvent(e)"
            >
              <span class="when"
                ><b>{{ dayText(e) }}</b
                ><br />{{ timeText(e) }}</span
              >
              <span class="what"
                ><span class="t">{{ e.title }}</span
                ><span class="d">{{ e.detail }}</span
                ><span class="in">{{ inWords(e) }}</span></span
              >
            </component>
          </li>
        </ul>
      </section>
      <p v-if="!eventsUi.busy && !groups.length" class="note">
        Nothing in this range. Try a longer one, or more kinds.
      </p>
    </div>
    <p class="foot">
      Times are in your computer's time zone (hover for UTC). Moon phases are good to about half an hour; eclipse times
      are NASA's. Launch data: The Space Devs, Launch Library 2.
    </p>
  </aside>
</template>
