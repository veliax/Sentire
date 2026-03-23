"""
vlm.py — Visual Language Model stage of the Sentire pipeline.

Consumes the output of detect.py (llm_input.json + the original video) and uses
Google Gemini 2.5 Flash to interpret the footage and produce structured event
metadata matching the Events table schema.

Usage:
    vlm.py <video_path> <video_id>

where <video_path> is the original (unprocessed) video. The script expects
llm_input.json to exist alongside it (same directory), as produced by detect.py.

Stdout (single line, on success): a JSON object describing the run, including
the path to vlm_output.json which contains the events ready for DB insertion.
Stderr: progress logs.
"""

import sys
import os
import json
import time

from google import genai
from google.genai import types


# --- Configuration -----------------------------------------------------------

MODEL = "gemini-2.5-flash"

SYSTEM_INSTRUCTION = """You are a surveillance event analyst for the Sentire system.

You will receive a video clip together with a JSON payload of object-detection
results from YOLOv8 (people, knives, scissors with bounding boxes, confidences,
and timestamps). Your job is to identify discrete EVENTS taking place in the
video. An event is a coherent occurrence with a clear start and end, e.g.
"person enters scene", "two people fight", "person brandishes a knife",
"person loiters near doorway".

Severity scale:
  - "low":    benign activity (walking, standing, normal movement)
  - "medium": suspicious behavior (loitering, aggressive posture, arguing, running)
  - "high":   violent or weapon-involved activity (fighting, weapon visible, assault)

Rules:
  - Output ONLY the JSON object that conforms to the provided schema. No prose.
  - sequence_number starts at 1 and increments per event in chronological order.
  - description is one short sentence (<= 140 characters) in plain English.
  - event_start and event_end are timestamp strings in MM:SS format.
    event_end must be >= event_start.
  - If nothing notable happens, return {"events": []}.
  - Do NOT invent objects or actions not visible in the video or supported
    by the detection data.
  - Use the YOLO detections as grounding signal: weapon detections strongly
    bias toward "high" severity if the weapon is being used or brandished.
"""

USER_PROMPT_TEMPLATE = """Analyze the attached video and identify events.

Object-detection results from YOLOv8 (use these to ground your interpretation):

```json
{detections}
```

Return events as JSON matching the response schema."""


# --- Response schema (forces structured output) ------------------------------

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "events": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "sequence_number": {"type": "INTEGER"},
                    "severity": {
                        "type": "STRING",
                        "enum": ["low", "medium", "high"],
                    },
                    "description": {"type": "STRING"},
                    "event_start": {"type": "STRING"},
                    "event_end": {"type": "STRING"},
                },
                "required": [
                    "sequence_number",
                    "severity",
                    "description",
                    "event_start",
                    "event_end",
                ],
            },
        }
    },
    "required": ["events"],
}


# --- Helpers -----------------------------------------------------------------

def log(msg: str) -> None:
    """Stderr logging so stdout remains pure JSON for the Node parent."""
    print(f"[vlm] {msg}", file=sys.stderr, flush=True)


def wait_for_file_active(client: genai.Client, file_name: str, timeout: int = 300):
    """Poll until uploaded file finishes processing or fails."""
    start = time.time()
    while True:
        f = client.files.get(name=file_name)
        state = f.state.name if hasattr(f.state, "name") else str(f.state)
        if state == "ACTIVE":
            return f
        if state == "FAILED":
            raise RuntimeError(f"Gemini file processing FAILED for {file_name}")
        if time.time() - start > timeout:
            raise TimeoutError(
                f"Gemini file processing timed out after {timeout}s (state={state})"
            )
        time.sleep(2)


def build_compact_detections(llm_input: dict) -> dict:
    """Strip bbox coords to keep the prompt small — VLM only needs class+timing."""
    compact_frames = []
    for fr in llm_input.get("frames", []):
        compact_frames.append({
            "timestamp": fr["timestamp"],
            "frame": fr["frame"],
            "priority": fr["has_priority_objects"],
            "objects": [
                {"class": o["class"], "confidence": o["confidence"]}
                for o in fr["objects"]
            ],
        })
    return {
        "video_id": llm_input.get("video_id"),
        "fps": llm_input.get("fps"),
        "total_frames": llm_input.get("total_frames"),
        "frames": compact_frames,
    }


# --- Main --------------------------------------------------------------------

def run(video_path: str, video_id: int) -> dict:
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    video_dir = os.path.dirname(video_path)
    llm_input_path = os.path.join(video_dir, "llm_input.json")
    output_path = os.path.join(video_dir, "vlm_output.json")

    if not os.path.exists(llm_input_path):
        raise FileNotFoundError(f"Missing detect.py output: {llm_input_path}")

    with open(llm_input_path) as f:
        llm_input = json.load(f)

    detections = build_compact_detections(llm_input)

    # Short-circuit: if YOLO found nothing relevant, skip the VLM call entirely.
    if not detections["frames"]:
        log("no detections from YOLO — skipping Gemini call")
        result = {
            "video_id": video_id,
            "events_count": 0,
            "events": [],
            "vlm_output_path": output_path,
            "skipped": True,
        }
        with open(output_path, "w") as f:
            json.dump(result, f, indent=2)
        print(json.dumps(result))
        return result

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set")

    client = genai.Client(api_key=api_key)

    # 1. Upload the video. The Files API handles videos > 20MB; for smaller
    #    ones it still works fine and saves us from base64 inlining.
    log(f"uploading video: {video_path}")
    uploaded = client.files.upload(
        file=video_path,
        config=types.UploadFileConfig(mime_type="video/mp4"),
    )

    # 2. Wait for Gemini to finish processing the video.
    log(f"waiting for file to become ACTIVE (name={uploaded.name})")
    uploaded = wait_for_file_active(client, uploaded.name)

    # 3. Build the prompt and call generate_content with structured output.
    user_prompt = USER_PROMPT_TEMPLATE.format(
        detections=json.dumps(detections, indent=2)
    )

    log(f"calling {MODEL}")
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[
                types.Part.from_uri(
                    file_uri=uploaded.uri,
                    mime_type=uploaded.mime_type,
                ),
                user_prompt,
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=RESPONSE_SCHEMA,
                temperature=0.2,
            ),
        )
    finally:
        # 4. Best-effort cleanup of the uploaded file (free tier has quota).
        try:
            client.files.delete(name=uploaded.name)
        except Exception as e:
            log(f"warning: failed to delete uploaded file: {e}")

    # 5. Parse the response. With response_schema set, response.text is JSON.
    raw = response.text or ""
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            f"Gemini did not return valid JSON: {e}\n--- raw ---\n{raw[:1000]}"
        )

    events = parsed.get("events", [])

    # Make sequence numbers monotonic from 1 just in case the model drifted.
    for i, ev in enumerate(events, start=1):
        ev["sequence_number"] = i

    result = {
        "video_id": video_id,
        "events_count": len(events),
        "events": events,
        "vlm_output_path": output_path,
        "skipped": False,
    }

    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)

    log(f"wrote {len(events)} events to {output_path}")
    print(json.dumps(result))
    return result


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: vlm.py <video_path> <video_id>"}))
        sys.exit(1)

    try:
        run(sys.argv[1], int(sys.argv[2]))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
