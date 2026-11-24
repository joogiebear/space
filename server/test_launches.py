"""Run with: python -m unittest discover -s server -p 'test_*.py'"""
import json, unittest

from server.sources.launches import reduce_launches


class ReduceLaunches(unittest.TestCase):
    def test_sorts_soonest_first_and_keeps_the_fields_the_front_end_reads(self):
        payload = {'results': [
            {'net': '2026-12-02T00:00:00Z', 'name': 'B', 'lsp_name': 'Provider', 'location': 'Site', 'status': {'abbrev': 'Go'}},
            {'net': '2026-12-01T00:00:00Z', 'name': 'A'},
        ]}
        out = json.loads(reduce_launches(payload, 'now'))
        self.assertEqual(out['fetched'], 'now')
        self.assertEqual([r[1] for r in out['launches']], ['A', 'B'])
        self.assertEqual(out['launches'][1], ['2026-12-02T00:00:00Z', 'B', 'Provider', 'Site', 'Go'])
        self.assertEqual(out['launches'][0], ['2026-12-01T00:00:00Z', 'A', '', '', ''])

    def test_skips_rows_without_a_time_or_a_name(self):
        payload = {'results': [{'name': 'no time'}, {'net': '2026-12-01T00:00:00Z'}, {'net': None, 'name': 'x'}]}
        self.assertEqual(json.loads(reduce_launches(payload, 'now'))['launches'], [])

    def test_empty_payload(self):
        self.assertEqual(json.loads(reduce_launches({}, 'now'))['launches'], [])

    def test_falls_back_to_the_pad_when_the_location_is_missing(self):
        payload = {'results': [{'net': '2026-12-01T00:00:00Z', 'name': 'A', 'pad': 'LC-39A'}]}
        self.assertEqual(json.loads(reduce_launches(payload, 'now'))['launches'][0][3], 'LC-39A')


if __name__ == '__main__':
    unittest.main()
