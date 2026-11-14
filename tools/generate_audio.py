#!/usr/bin/env python3
"""Gera MP3 em espanhol para o Habla usando Kokoro-82M (Apache-2.0).

Modo de uso:
  python tools/generate_audio.py --max-new 80

O site só reproduz os MP3 gerados; o modelo TTS não fica no GitHub Pages.
Execute em ambiente confiável com internet para baixar o modelo.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "audio" / "sources.json"
INDEX = ROOT / "audio" / "index.json"
CLIPS = ROOT / "audio" / "clips"
SAMPLE_RATE = 24000

def canonical(text: str) -> str:
    return " ".join(unicodedata.normalize("NFC", text).split())

def filename(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:20] + ".mp3"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-new", type=int, default=80, help="Quantidade máxima de novos arquivos nesta execução")
    parser.add_argument("--voice", choices=["ef_dora", "em_alex", "em_santa"], default="ef_dora")
    args = parser.parse_args()

    sources = json.loads(SOURCES.read_text(encoding="utf-8"))
    previous = json.loads(INDEX.read_text(encoding="utf-8")) if INDEX.exists() else {}
    previous_voice = previous.get("voice")
    if previous_voice and previous_voice != args.voice and previous.get("clips"):
        raise SystemExit(
            f"O catálogo já usa {previous_voice}. Para trocar a voz, gere um novo catálogo completo, não misture vozes."
        )
    index = {"version": 1, "voice": args.voice,
             "disclosure": "Voz sintetizada por inteligência artificial",
             "clips": previous.get("clips") or {}}
    texts = list(dict.fromkeys(canonical(x) for x in sources["phrases"] if isinstance(x,str) and canonical(x)))
    pending = [(t, filename(t)) for t in texts if not (CLIPS / filename(t)).exists()][:args.max_new]
    if not pending:
        print("Todos os clips selecionados já foram gerados. Nada a fazer.")
        return 0

    # Importação tardia: --help e validação de catálogo não exigem modelo baixado.
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
    CLIPS.mkdir(parents=True, exist_ok=True)
    pipeline = KPipeline(lang_code="e", device="cpu")
    successes, errors = 0, []
    for i, (sentence, name) in enumerate(pending, start=1):
        try:
            segments = []
            for result in pipeline(sentence, voice=args.voice, speed=1):
                # KPipeline.Result contém graphemes, phonemes e áudio de 24 kHz.
                samples = result.audio
                if samples is None:
                    continue
                if hasattr(samples,"detach"):
                    samples = samples.detach().cpu().numpy()
                samples = np.asarray(samples, dtype=np.float32).reshape(-1)
                if samples.size:
                    segments.append(samples)
            if not segments:
                raise RuntimeError("A síntese não retornou áudio.")
            audio = np.concatenate(segments)
            with tempfile.TemporaryDirectory() as td:
                wav = Path(td) / "temp.wav"
                sf.write(wav, audio, SAMPLE_RATE)
                target = CLIPS / name
                subprocess.run([
                    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
                    "-ac", "1", "-ar", str(SAMPLE_RATE), "-codec:a", "libmp3lame",
                    "-b:a", "48k", str(target)
                ], check=True)
                if target.stat().st_size < 500:
                    raise RuntimeError("MP3 vazio ou incompleto.")
            index["clips"][sentence] = "clips/" + name
            successes += 1
            print(f"[{i}/{len(pending)}] OK {sentence[:80]}", flush=True)
        except Exception as err:
            (CLIPS / name).unlink(missing_ok=True)
            errors.append({"text": sentence, "error": str(err)})
            print(f"ERRO: {sentence[:80]} -> {err}", file=sys.stderr, flush=True)
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Gerados: {successes} | falhas: {len(errors)} | MP3 no catálogo: {len(index['clips'])}")
    if errors:
        (ROOT / "audio" / "last-errors.json").write_text(
            json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if successes else 1

if __name__ == "__main__":
    raise SystemExit(main())
