import { sceneEntered } from '@/engine/sceneManager';
import { $ } from './dom';
import { initInfoPanel, showInfo } from './infoPanel';
import { buildLayerPanel } from './layerPanel';
import { buildNav } from './nav';
import { buildObjectList } from './objectList';
import { buildPresetMenu, initPresetMenu } from './presetMenu';
import { initSearch, resetSearch } from './search';
import { initShortcuts } from './shortcuts';
import { initTimeControls } from './timeControls';
import { initTooltip } from './tooltip';

/** Wire every panel to the engine. Call once, before the first scene opens. */
export function initUI() {
  initInfoPanel(); initSearch(); initTimeControls(); initPresetMenu(); initTooltip(); initShortcuts();
  sceneEntered.on(sc => {
    $('#dateLbl').textContent = sc.timeLabel || 'Date';
    buildNav(); buildObjectList(); buildLayerPanel(); buildPresetMenu(); showInfo(null); resetSearch();
  });
}
