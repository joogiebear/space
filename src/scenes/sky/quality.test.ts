import { describe, expect, it } from 'vitest';
import { createFrameGovernor, wantsLightMilkyWay } from './quality';
import { MW_FS, MW_FS_LIGHT } from './shaders';

describe('which Milky Way to start with', () => {
  it('a touch screen or a modest machine gets the light one', () => {
    expect(wantsLightMilkyWay({ coarsePointer: true, cores: 12, memoryGb: 8 })).toBe(true);
    expect(wantsLightMilkyWay({ coarsePointer: false, cores: 4, memoryGb: 8 })).toBe(true);
    expect(wantsLightMilkyWay({ coarsePointer: false, cores: 12, memoryGb: 4 })).toBe(true);
  });
  it('a desktop gets the full one, and so does a browser that says nothing', () => {
    expect(wantsLightMilkyWay({ coarsePointer: false, cores: 8, memoryGb: 8 })).toBe(false);
    expect(wantsLightMilkyWay({ coarsePointer: false })).toBe(false);
  });
});

describe('the frame governor', () => {
  it('trips once when frames stay slow while the costly thing is drawn', () => {
    const g = createFrameGovernor(0.034, 10);
    const fired: boolean[] = [];
    for (let i = 0; i < 30; i++) fired.push(g(0.05, true));
    expect(fired.filter(Boolean)).toHaveLength(1);
    expect(fired[9]).toBe(true);
  });
  it('stays quiet when frames are fast', () => {
    const g = createFrameGovernor(0.034, 10);
    for (let i = 0; i < 100; i++) expect(g(0.016, true)).toBe(false);
  });
  it('does not count slow frames while it is not being drawn', () => {
    const g = createFrameGovernor(0.034, 10);
    for (let i = 0; i < 100; i++) expect(g(0.05, i % 5 !== 4)).toBe(false); // never 10 in a row
  });
  it('one slow spell among fast frames is averaged away', () => {
    const g = createFrameGovernor(0.034, 10);
    for (let i = 0; i < 10; i++) expect(g(i === 0 ? 0.05 : 0.016, true)).toBe(false);
  });
});

describe('the two Milky Way shaders', () => {
  it('the light one does less: fewer noise layers and no grain', () => {
    const noise = (s: string) => (s.match(/i<(\d)/g) ?? []).join(',');
    expect(noise(MW_FS)).toBe('i<5,i<5');
    expect(noise(MW_FS_LIGHT)).toBe('i<3,i<2');
    expect(MW_FS).toContain('vnoise(d*140.)');
    expect(MW_FS_LIGHT).not.toContain('vnoise(d*140.)');
  });
});
