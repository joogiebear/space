import { describe, expect, it } from 'vitest';
import {
  AU,
  C,
  LANDMARKS,
  LIGHT_YEAR,
  LOG_MAX,
  LOG_MIN,
  fmtDuration,
  fmtSize,
  fmtTimes,
  neighbours,
  nearest,
  powerOfTen,
  scalePos,
  travelSeconds,
} from './scale';

describe('landmarks', () => {
  it('are in order from the smallest to the largest, each with a story, and fit the slider', () => {
    for (let i = 1; i < LANDMARKS.length; i++)
      expect(LANDMARKS[i].m, LANDMARKS[i].id).toBeGreaterThan(LANDMARKS[i - 1].m);
    expect(new Set(LANDMARKS.map(l => l.id)).size).toBe(LANDMARKS.length);
    for (const l of LANDMARKS) {
      expect(l.note.length, l.id).toBeGreaterThan(30);
      expect(Math.log10(l.m), l.id).toBeGreaterThan(LOG_MIN);
      expect(Math.log10(l.m), l.id).toBeLessThan(LOG_MAX);
    }
  });
  it('span from a proton to the observable universe, forty-two powers of ten', () => {
    const lo = Math.log10(LANDMARKS[0].m),
      hi = Math.log10(LANDMARKS[LANDMARKS.length - 1].m);
    expect(hi - lo).toBeGreaterThan(41);
    expect(hi - lo).toBeLessThan(43);
  });
});

describe('writing a size', () => {
  it('picks a unit that reads well', () => {
    expect(fmtSize(1.7)).toBe('1.7 metres');
    expect(fmtSize(1)).toBe('1 metre');
    expect(fmtSize(1.2742e7)).toBe('12,742 km');
    expect(fmtSize(1.3927e9)).toBe('1.4 million km');
    expect(fmtSize(AU)).toBe('1 AU');
    expect(fmtSize(9e12)).toBe('60 AU');
    expect(fmtSize(4e16)).toBe('4.2 light years');
    expect(fmtSize(LIGHT_YEAR * 1e5)).toBe('100,000 light years');
    expect(fmtSize(9.46e22)).toBe('10 million light years');
    expect(fmtSize(8.8e26)).toBe('93 billion light years');
    expect(fmtSize(1.7e-15)).toBe('1.7 femtometres');
    expect(fmtSize(2e-9)).toBe('2 nanometres');
  });
  it('writes powers of ten', () => {
    expect(powerOfTen(0)).toBe('10⁰');
    expect(powerOfTen(-15)).toBe('10⁻¹⁵');
    expect(powerOfTen(26.9)).toBe('10²⁷');
  });
});

describe('how long', () => {
  it('writes durations in words', () => {
    expect(fmtDuration(1e-12)).toBe('less than a billionth of a second');
    expect(fmtDuration(4e-8)).toBe('40 billionths of a second');
    expect(fmtDuration(0.042)).toBe('42 thousandths of a second');
    expect(fmtDuration(1)).toBe('1 second');
    expect(fmtDuration(499)).toBe('8 minutes');
    expect(fmtDuration(14 * 3600)).toBe('14 hours');
    expect(fmtDuration(86400 * 100)).toBe('100 days');
    expect(fmtDuration(86400 * 365.25 * 4.2)).toBe('4 years');
    expect(fmtDuration(86400 * 365.25 * 75000)).toBe('75,000 years');
    expect(fmtDuration(86400 * 365.25 * 3e6)).toBe('3 million years');
    expect(fmtDuration(86400 * 365.25 * 9.3e9)).toBe('9.3 billion years');
    expect(fmtDuration(86400 * 365.25 * 9.3e10)).toBe('about 6.7 times the age of the universe');
    expect(fmtDuration(86400 * 365.25 * 3.6e15)).toContain('the age of the universe');
  });
  it('gets light across the Sun distance in about eight minutes and Voyager to Proxima in about 75,000 years', () => {
    expect(travelSeconds(AU, C) / 60).toBeCloseTo(8.3, 1);
    expect(travelSeconds(4.0e16, 17_000) / (365.25 * 86400)).toBeGreaterThan(70_000);
    expect(travelSeconds(4.0e16, 17_000) / (365.25 * 86400)).toBeLessThan(80_000);
  });
  it('takes light a year to go a light year', () => {
    expect(travelSeconds(LIGHT_YEAR, C) / (365.25 * 86400)).toBeCloseTo(1, 2);
  });
});

describe('comparisons', () => {
  it('says how many times bigger', () => {
    expect(fmtTimes(1.05)).toBe('about the same size');
    expect(fmtTimes(7)).toBe('about 7 times');
    expect(fmtTimes(1234)).toBe('about 1,200 times');
    expect(fmtTimes(3e6)).toBe('about 3 million times');
    expect(fmtTimes(2.5e9)).toBe('about 2.5 billion times');
    expect(fmtTimes(0.001)).toBe('about 1,000 times smaller');
  });
  it('finds the landmarks around a size', () => {
    const n = neighbours(1e4);
    expect(n.below?.id).toBe('everest');
    expect(n.above?.id).toBe('earth');
    expect(neighbours(1e-20).below).toBeUndefined();
    expect(nearest(2).id).toBe('human');
    expect(nearest(8e26).id).toBe('universe');
  });
  it('places a size on the slider between 0 and 1', () => {
    expect(scalePos(10 ** LOG_MIN)).toBeCloseTo(0, 6);
    expect(scalePos(10 ** LOG_MAX)).toBeCloseTo(1, 6);
    expect(scalePos(1.7)).toBeGreaterThan(0.3);
    expect(scalePos(1.7)).toBeLessThan(0.45);
  });
});
