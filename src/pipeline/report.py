"""
report.py — Narrative report generator for the Sentire pipeline.

Reads the YOLO detections (llm_input.json) and the VLM events (vlm_output.json)
for a given video and asks Gemini to write a professional surveillance report
narrative.

Usage:
    report.py <video_dir> <video_id> [video_name] [video_location]

Stdout: a single JSON object {narrative, stats} ready to be persisted by Node.
Stderr: progress logs.
"""

import sys
import os
import json
from collections import Counter

from google import genai
from google.genai import types


MODEL = "gemini-2.5-flash"

SYSTEM_INSTRUCTION = """You are a surveillance analyst writing a formal incident
report for the Sentire system. You receive structured event data (object
detections plus VLM-interpreted events with severity ratings) and produce a
clear, professional narrative aimed at a security operator or law enforcement
officer.

Tone: factual, neutral, third-person. No speculation beyond what the data
supports. No marketing language. No emojis.

Structure your narrative in plain prose paragraphs (no markdown headings, no
bullet points — those are added separately by the rendering layer):

  1. Executive summary (2-3 sentences): what was observed overall, time range,
     highest severity reached.
  2. Chronological account: walk through events in order, citing timestamps,
     describing what was seen, and noting which YOLO classes were detected.
  3. Risk assessment (1-2 sentences): concluding judgement on the level of
     concern this footage warrants.

Keep the total length to roughly 200-400 words. Do not invent details. If the
data is sparse, say so."""


def compute_stats(llm_input: dict, vlm_output: dict) -> dict:
    """Aggregate counts that go in the report's structured stats block."""
    frames = llm_input.get("frames", [])
    events = vlm_output.get("events", [])

    class_counter: Counter = Counter()
    priority_frames = 0
    for fr in frames:
        if fr.get("has_priority_objects"):
            priority_frames += 1
        for obj in fr.get("objects", []):
            class_counter[obj["class"]] += 1

    severity_counter: Counter = Counter()
    for ev in events:
        severity_counter[ev.get("severity", "low")] += 1

    return {
        "total_frames_analyzed": len(frames),
        "priority_frames": priority_frames,
        "object_class_counts": dict(class_counter),
        "events_total": len(events),
        "severity_counts": {
            "low":    severity_counter.get("low", 0),
            "medium": severity_counter.get("medium", 0),
            "high":   severity_counter.get("high", 0),
        },
        "highest_severity": (
            "high" if severity_counter.get("high")
            else "medium" if severity_counter.get("medium")
            else "low" if severity_counter.get("low")
            else "none"
        ),
    }


def build_prompt(stats: dict, events: list, video_name: str, location: str) -> str:
    return f"""Generate the narrative for the following surveillance footage.

Video name: {video_name}
Location: {location or "not specified"}

Detection statistics:
{json.dumps(stats, indent=2)}

Detected events (chronological, from the VLM stage):
{json.dumps(events, indent=2)}

Write the narrative as instructed in your system prompt."""


def log(msg: str) -> None:
    print(f"[report] {msg}", file=sys.stderr, flush=True)


def run(video_dir: str, video_id: int, video_name: str, location: str) -> dict:
    llm_input_path = os.path.join(video_dir, "llm_input.json")
    vlm_output_path = os.path.join(video_dir, "vlm_output.json")

    if not os.path.exists(llm_input_path):
        raise FileNotFoundError(f"Missing detect.py output: {llm_input_path}")
    if not os.path.exists(vlm_output_path):
        raise FileNotFoundError(f"Missing vlm.py output: {vlm_output_path}")

    with open(llm_input_path) as f:
        llm_input = json.load(f)
    with open(vlm_output_path) as f:
        vlm_output = json.load(f)

    stats = compute_stats(llm_input, vlm_output)
    events = vlm_output.get("events", [])

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set")

    client = genai.Client(api_key=api_key)

    log(f"calling {MODEL}")
    response = client.models.generate_content(
        model=MODEL,
        contents=build_prompt(stats, events, video_name, location),
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.3,
        ),
    )

    narrative = (response.text or "").strip()
    if not narrative:
        raise RuntimeError("Gemini returned an empty narrative")

    result = {
        "video_id": video_id,
        "narrative": narrative,
        "stats": stats,
    }

    output_path = os.path.join(video_dir, "report.json")
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)

    log(f"wrote report to {output_path}")
    print(json.dumps(result))
    return result


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: report.py <video_dir> <video_id> [video_name] [video_location]"}))
        sys.exit(1)

    video_dir = sys.argv[1]
    video_id = int(sys.argv[2])
    video_name = sys.argv[3] if len(sys.argv) > 3 else f"Video {video_id}"
    location = sys.argv[4] if len(sys.argv) > 4 else ""

    try:
        run(video_dir, video_id, video_name, location)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
