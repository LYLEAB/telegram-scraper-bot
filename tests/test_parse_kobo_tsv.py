import tempfile
import unittest
from pathlib import Path

from scripts.parse_kobo_tsv import parse_choices_tsv


class ParseKoboTsvTests(unittest.TestCase):
    def test_parse_choices_tsv_normalizes_district_dealers(self):
        content = (
            "list_name\tname\tlabel\tregion\tprovince\tcat\tdealer1\tdealer2\n"
            "region\tr1\tRegion 1\t\t\t\t\t\n"
            "dealer\td1\tDealer 1\tr1\t\t\t\t\n"
            "province\tp1\tProvince 1\t\t\t\t\t\n"
            "district\tdis1\tDistrict 1\t\tp1\t\td1\t\n"
            "category\tcat1\tCategory 1\t\t\t\t\t\n"
            "brand\tb1\tBrand 1\t\t\tcat1\t\t\n"
            "channel_select\tc1\tOff Trade\t\t\t\t\t\n"
            "sub_channel\tsc1\tWholesale\t\t\t\t\t\n"
            "type_select\tt1\tNCP\t\t\t\t\t\n"
            "price_source\tps1\tWholesale\t\t\t\t\t\n"
        )

        with tempfile.TemporaryDirectory() as tmp:
            input_path = Path(tmp) / "choices.tsv"
            input_path.write_text(content, encoding="utf-8")
            parsed = parse_choices_tsv(input_path)

        self.assertEqual(parsed["regions"][0]["code"], "r1")
        self.assertEqual(parsed["dealers"][0]["region_code"], "r1")
        self.assertEqual(parsed["districts"][0]["province_code"], "p1")
        self.assertEqual(parsed["brands"][0]["category_code"], "cat1")
        self.assertIn({"district_code": "dis1", "dealer_code": "d1"}, parsed["district_dealers"])


if __name__ == '__main__':
    unittest.main()
