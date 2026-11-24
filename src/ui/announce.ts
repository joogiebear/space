import { ui } from './store';

/**
 * Say something to screen-reader users without changing the visible page. A live region only speaks when its text
 * changes, so a repeated message gets an invisible zero-width space appended every other time.
 */
export function announce(text: string) {
  ui.announce = ui.announce === text ? text + '​' : text;
}
