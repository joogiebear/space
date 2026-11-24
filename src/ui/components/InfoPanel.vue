<script setup lang="ts">
import { openScene } from '@/engine/sceneManager';
import { App } from '@/engine/state';
import { refreshInfo } from '../bridge';
import { ui } from '../store';

/** Details for the selected body (or the scene intro), plus its action and "enter" buttons. */
async function runAction() {
  const a = App.sel && App.sel.action;
  if (a) {
    await a.run();
    refreshInfo(App.sel);
  }
}
const enter = () => {
  if (App.sel && App.sel.enter) openScene(App.sel.enter);
};
</script>

<template>
  <div id="info" class="panel">
    <h2 id="iT">{{ ui.info.title }}</h2>
    <div id="iS" class="sub">{{ ui.info.sub }}</div>
    <p id="iP">{{ ui.info.text }}</p>
    <dl id="rows">
      <template v-for="([k, v], i) in ui.info.rows" :key="i">
        <dt>{{ k }}</dt>
        <dd>{{ v }}</dd>
      </template>
    </dl>
    <button v-show="ui.info.actionLabel" id="act" @click="runAction">{{ ui.info.actionLabel }}</button>
    <button v-show="ui.info.enterLabel" id="enter" @click="enter">{{ ui.info.enterLabel }}</button>
  </div>
</template>
