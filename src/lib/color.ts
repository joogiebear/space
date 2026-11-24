/** Stellar colour from the B-V colour index. */
import { clamp } from './math';

const BV: number[][] = [[-.3, 155, 176, 255], [0, 170, 191, 255], [.3, 202, 215, 255], [.6, 255, 242, 224], [.8, 255, 229, 207], [1.2, 255, 196, 111], [1.6, 255, 157, 80], [2.1, 255, 115, 60]];
export function bvColor(ci: number, o: ArrayLike<number> & { [i: number]: number }, k = 0) {
  ci = clamp(ci, -.3, 2.1); let i = 0; while (i < BV.length - 2 && ci > BV[i + 1][0]) i++;
  const a = BV[i], b = BV[i + 1], t = (ci - a[0]) / (b[0] - a[0]);
  o[k] = (a[1] + (b[1] - a[1]) * t) / 255; o[k + 1] = (a[2] + (b[2] - a[2]) * t) / 255; o[k + 2] = (a[3] + (b[3] - a[3]) * t) / 255;
}
