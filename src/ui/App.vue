<script setup lang="ts">
import HoverTip from './components/HoverTip.vue';
import InfoPanel from './components/InfoPanel.vue';
import LocationDialog from './components/LocationDialog.vue';
import SearchBox from './components/SearchBox.vue';
import SidePanel from './components/SidePanel.vue';
import TimePanel from './components/TimePanel.vue';
import ToastMessage from './components/ToastMessage.vue';
import TopBar from './components/TopBar.vue';
</script>

<template>
  <TopBar />
  <SearchBox />
  <SidePanel />
  <InfoPanel />
  <TimePanel />
  <HoverTip />
  <ToastMessage />
  <LocationDialog />
</template>
