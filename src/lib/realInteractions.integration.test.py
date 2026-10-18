"""Live policy regression checks; requires the managed preview session."""
import json
import os
import unittest
from pathlib import Path
import requests


class RealInteractionsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        if not raw:
            raise unittest.SkipTest("Managed preview session required")
        session = json.loads(raw)
        config = {}
        for line in Path(".env").read_text().splitlines():
            if "=" in line:
                key, value = line.split("=", 1)
                config[key] = value.strip().strip('"').strip("'")
        cls.url = config["VITE_SUPABASE_URL"] + "/rest/v1/"
        cls.headers = {
            "apikey": config["VITE_SUPABASE_PUBLISHABLE_KEY"],
            "Authorization": "Bearer " + session["access_token"],
        }
        cls.me = session["user"]["id"]
        cls.demo = "024d1e98-01e8-4387-872a-b12517097054"
        cls.other = next(uid for uid in [
            "035e58e3-abf9-4c02-8080-852d1016bbdd",
            "384cd5ae-c13a-418d-ad1e-6215e173c8f8",
        ] if uid != cls.me)

    def predicate(self, first, second):
        response = requests.post(self.url + "rpc/is_real_interaction", headers=self.headers,
                                 json={"_first": first, "_second": second}, timeout=20)
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_demo_participants_are_excluded(self):
        self.assertIs(self.predicate(self.me, self.demo), False)
        self.assertIs(self.predicate(self.demo, self.me), False)

    def test_registered_non_demo_participants_are_allowed(self):
        self.assertIs(self.predicate(self.me, self.other), True)

    def test_unrelated_users_cannot_be_inspected(self):
        self.assertIs(self.predicate(self.other, self.demo), False)

    def test_visible_matches_and_likes_contain_no_demo_activity(self):
        for table, columns in [("matches", "user1_id,user2_id"), ("swipes", "swiper_id,swiped_id")]:
            response = requests.get(self.url + table, headers=self.headers,
                                    params={"select": columns}, timeout=20)
            self.assertEqual(response.status_code, 200)
            for row in response.json():
                first, second = [row[column] for column in columns.split(",")]
                self.assertIs(self.predicate(first, second), True)


if __name__ == "__main__":
    unittest.main()