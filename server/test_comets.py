"""Run with: python -m unittest discover -s server -p 'test_*.py'"""
import json, unittest

from server.sources.comets import reduce_comets

FIELDS = ['full_name', 'e', 'i', 'om', 'w', 'q', 'tp', 'M1', 'K1']
JD = 2461000.0


def payload(*rows):
    return {'fields': FIELDS, 'data': [list(r) for r in rows]}


class ReduceComets(unittest.TestCase):
    def test_keeps_the_fields_the_front_end_reads_soonest_perihelion_first(self):
        out = json.loads(reduce_comets(payload(
            ('  B/2026 X', '0.9', '10', '20', '30', '1.1', str(JD + 200), '8.0', '5.0'),
            ('  A/2026 Y', '0.8', '11', '21', '31', '0.9', str(JD + 20), '9.5', None),
        ), JD))['comets']
        self.assertEqual([c[0] for c in out], ['A/2026 Y', 'B/2026 X'])
        self.assertEqual(out[1], ['B/2026 X', 1.1, 0.9, 10.0, 20.0, 30.0, JD + 200, 8.0, 5.0])

    def test_a_missing_slope_gets_the_usual_default(self):
        out = json.loads(reduce_comets(payload(('C', '0.5', '1', '2', '3', '1.0', str(JD), '7', None)), JD))['comets']
        self.assertEqual(out[0][8], 10.0)

    def test_drops_comets_without_a_magnitude_or_open_orbits_or_far_off_perihelia(self):
        out = json.loads(reduce_comets(payload(
            ('no magnitude', '0.5', '1', '2', '3', '1.0', str(JD), None, None),
            ('open orbit', '1.2', '1', '2', '3', '1.0', str(JD), '8', '10'),
            ('long gone', '0.5', '1', '2', '3', '1.0', str(JD - 400), '8', '10'),
            ('far future', '0.5', '1', '2', '3', '1.0', str(JD + 5000), '8', '10'),
            ('keeper', '0.5', '1', '2', '3', '1.0', str(JD - 30), '8', '10'),
        ), JD))['comets']
        self.assertEqual([c[0] for c in out], ['keeper'])

    def test_empty_payload(self):
        self.assertEqual(json.loads(reduce_comets({}, JD))['comets'], [])


if __name__ == '__main__':
    unittest.main()
