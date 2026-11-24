/** The planets Sky Tonight shows: a dot colour, whether the naked eye can see them, and a line about each. */
export const PLANETS: { id: string; label: string; color: [number, number, number]; naked: boolean; text: string }[] = [
  {
    id: 'mercury',
    label: 'Mercury',
    color: [0.78, 0.74, 0.7],
    naked: true,
    text: 'Always close to the Sun, so look low in the west after sunset or low in the east before sunrise.',
  },
  {
    id: 'venus',
    label: 'Venus',
    color: [1, 0.94, 0.78],
    naked: true,
    text: 'The brightest planet, the “morning” or “evening star”. It never strays more than 47° from the Sun.',
  },
  {
    id: 'mars',
    label: 'Mars',
    color: [1, 0.55, 0.36],
    naked: true,
    text: 'The red planet. It is at its brightest every two years or so, when Earth overtakes it.',
  },
  {
    id: 'jupiter',
    label: 'Jupiter',
    color: [1, 0.9, 0.75],
    naked: true,
    text: 'Steady and brilliant. Binoculars show its four large moons as a line of tiny dots.',
  },
  {
    id: 'saturn',
    label: 'Saturn',
    color: [0.95, 0.86, 0.62],
    naked: true,
    text: 'A pale gold point. Its rings need a small telescope to see.',
  },
  {
    id: 'uranus',
    label: 'Uranus',
    color: [0.62, 0.9, 0.93],
    naked: false,
    text: 'Just at the limit of naked-eye visibility under very dark skies; binoculars make it easy.',
  },
  {
    id: 'neptune',
    label: 'Neptune',
    color: [0.48, 0.6, 1],
    naked: false,
    text: 'Too faint to see without a telescope or good binoculars.',
  },
];
