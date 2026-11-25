import { describe, expect, it } from 'vitest';
import { diagLines } from './diag';

describe('diagLines', () => {
  const base = { gpu: 'Mali-G78', fps: 58.6, worst: 41.2, viewport: '390×844', dpr: 3, coarse: true, light: true };
  it('reports frame rate, device and the shader the Milky Way starts on', () => {
    const t = diagLines({ ...base, cores: 8, memoryGb: 4 }).join('\n');
    expect(t).toContain('59 fps (worst frame 41 ms)');
    expect(t).toContain('Mali-G78');
    expect(t).toContain('390×844 @ 3x');
    expect(t).toContain('touch yes · 8 cores · 4 GB');
    expect(t).toContain('light shader');
  });
  it('says ? when the browser will not tell', () => {
    expect(diagLines({ ...base, coarse: false, light: false }).join('\n')).toContain('touch no · ? cores · ? GB');
  });
});
