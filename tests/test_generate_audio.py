"""Testes de catálogo e recuperação. Não baixam o modelo nem sintetizam voz."""
import importlib.util
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("generate_audio", ROOT / "tools" / "generate_audio.py")
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.audio = self.root / "audio"
        self.clips = self.audio / "clips"
        self.clips.mkdir(parents=True)
        self.sources = self.audio / "sources.json"
        self.index = self.audio / "index.json"
        self.sources.write_text(json.dumps({"phrases": ["Hola", "Adiós"]}), encoding="utf-8")
        self.paths = patch.multiple(generator, ROOT=self.root, SOURCES=self.sources, INDEX=self.index, CLIPS=self.clips)
        self.paths.start()

    def tearDown(self):
        self.paths.stop()
        self.directory.cleanup()

    def run_main(self, *args):
        with patch.object(sys, "argv", ["generate_audio.py", *args]):
            return generator.main()

    def write_clip(self, text, size=600):
        name = generator.filename(text)
        (self.clips / name).write_bytes(b"x" * size)
        return "clips/" + name

    def read_index(self):
        return json.loads(self.index.read_text(encoding="utf-8"))

    def test_reconcile_orphan_without_model(self):
        relative = self.write_clip("Hola")
        self.assertEqual(self.run_main("--max-new", "0"), 0)
        self.assertEqual(self.read_index()["clips"], {"Hola": relative})
        self.assertFalse(self.index.with_suffix(".json.tmp").exists())

    def test_missing_and_incomplete_files_are_not_considered_generated(self):
        relative = self.write_clip("Hola", 30)
        self.index.write_text(json.dumps({"voice": "ef_dora", "clips": {"Hola": relative, "Adiós": "clips/missing.mp3"}}), encoding="utf-8")
        self.assertEqual(self.run_main("--validate-only"), 1)
        self.assertEqual(self.run_main("--max-new", "0"), 0)
        self.assertEqual(self.read_index()["clips"], {})

    def test_reject_traversal_and_noncanonical_text(self):
        self.assertEqual(len(generator.validate_index({"clips": {" Hola ": "../../private.mp3"}})), 2)

    def test_no_voice_mixing(self):
        self.index.write_text(json.dumps({"voice": "em_alex", "clips": {"Hola": "clips/hola.mp3"}}), encoding="utf-8")
        with self.assertRaises(SystemExit):
            self.run_main("--max-new", "0")

    def test_negative_limit_is_invalid(self):
        with self.assertRaises(SystemExit) as raised:
            self.run_main("--max-new", "-1")
        self.assertEqual(raised.exception.code, 2)

    def test_normalization(self):
        self.assertEqual(generator.canonical("  ¿Co\u0301mo\n estás?  "), "¿Cómo estás?")

    def test_partial_failure_reports_error_and_keeps_completed_audio(self):
        class Samples:
            size = 1000
            def reshape(self, *_):
                return self
        samples = Samples()
        fake_numpy = types.SimpleNamespace(asarray=lambda *a, **k: samples, float32="float32", concatenate=lambda _: samples)
        fake_soundfile = types.SimpleNamespace(write=lambda *a: None)
        fake_kokoro = types.SimpleNamespace(KPipeline=lambda **_: lambda *a, **k: [types.SimpleNamespace(audio=samples)])
        calls = []
        def encode(command, **_):
            calls.append(command)
            if len(calls) == 2:
                Path(command[-1]).write_bytes(b"partial")
                raise RuntimeError("encoding failed")
            Path(command[-1]).write_bytes(b"x" * 600)
        with patch.dict(sys.modules, {"numpy": fake_numpy, "soundfile": fake_soundfile, "kokoro": fake_kokoro}), patch.object(generator.subprocess, "run", encode):
            self.assertEqual(self.run_main("--max-new", "2"), 1)
        self.assertEqual(list(self.read_index()["clips"]), ["Hola"])
        self.assertTrue((self.clips / generator.filename("Hola")).exists())
        self.assertFalse(list(self.clips.glob("*.tmp.mp3")))
        self.assertTrue((self.audio / "last-errors.json").exists())


if __name__ == "__main__":
    unittest.main()
