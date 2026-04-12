import sys
import json
import cv2
import os
import subprocess
from ultralytics import YOLO

def detect_video(video_path: str, video_id: int):
    model = YOLO("yolov8s.pt")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(json.dumps({"error": f"Could not open video: {video_path}"}))
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    sample_rate = max(1, int(fps // 2))  # 2 frames per second

    # Output paths
    video_dir = "/".join(video_path.split("/")[:-1])
    processed_path = f"{video_dir}/processed.mp4"
    detections_path = f"{video_dir}/detections.json"
    llm_path = f"{video_dir}/llm_input.json"

    # Only detect these classes
    allowed_classes = {
        0:  "person",
        43: "knife",
        76: "scissors",
    }

    # High priority classes — weapons
    high_priority_classes = {43, 76}

    # Colors per class (BGR)
    colors = {
        0:  (0, 255, 0),   # person — green
        43: (0, 0, 255),   # knife — red
        76: (0, 0, 255),   # scissors — red
    }

    # Video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(processed_path, fourcc, fps, (width, height))

    detections = []
    frame_number = 0
    last_boxes = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_number % sample_rate == 0:
            results = model(frame, verbose=False, iou=0.4, conf=0.5)[0]
            last_boxes = []

            timestamp_sec = frame_number / fps if fps > 0 else 0
            minutes = int(timestamp_sec // 60)
            seconds = int(timestamp_sec % 60)
            timestamp = f"{minutes:02d}:{seconds:02d}"

            frame_detections = []
            for box in results.boxes:
                class_id = int(box.cls[0])

                # Skip classes we don't care about
                if class_id not in allowed_classes:
                    continue

                x1, y1, x2, y2 = box.xyxy[0].tolist()
                class_name = allowed_classes[class_id]
                confidence = round(float(box.conf[0]), 4)

                last_boxes.append({
                    "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": confidence,
                })

                frame_detections.append({
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": confidence,
                    "priority": class_id in high_priority_classes,
                    "bounding_box": {
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "x2": round(x2, 2),
                        "y2": round(y2, 2),
                    }
                })

            if frame_detections:
                has_priority = any(d["priority"] for d in frame_detections)
                detections.append({
                    "frame": frame_number,
                    "timestamp": timestamp,
                    "has_priority_objects": has_priority,
                    "objects": frame_detections
                })

        # Draw last known boxes on every frame
        for box in last_boxes:
            x1, y1, x2, y2 = int(box["x1"]), int(box["y1"]), int(box["x2"]), int(box["y2"])
            class_id = box["class_id"]
            color = colors.get(class_id, (0, 200, 255))
            label = f"{box['class_name']} {box['confidence']:.0%}"

            # Bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            # Label background
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(frame, (x1, y1 - th - 6), (x1 + tw + 4, y1), color, -1)

            # Label text
            cv2.putText(frame, label, (x1 + 2, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)

        out.write(frame)
        frame_number += 1

    cap.release()
    out.release()

    # Re-encode with ffmpeg for browser compatibility
    final_path = f"{video_dir}/processed_final.mp4"
    subprocess.run([
        "ffmpeg", "-y",
        "-i", processed_path,
        "-vcodec", "libx264",
        "-crf", "23",
        "-preset", "fast",
        "-acodec", "aac",
        final_path
    ], capture_output=True)

    # Clean up intermediate file
    os.remove(processed_path)

    # Save full detections
    output = {
        "video_id": video_id,
        "total_frames": total_frames,
        "frames_processed": frame_number // sample_rate,
        "processed_video": final_path,
        "detections_path": detections_path,
        "llm_input_path": llm_path,
        "detections": detections
    }

    with open(detections_path, "w") as f:
        json.dump(output, f, indent=2)

    # Save LLM-ready format
    llm_output = []
    for frame_data in detections:
        llm_output.append({
            "timestamp": frame_data["timestamp"],
            "frame": frame_data["frame"],
            "has_priority_objects": frame_data["has_priority_objects"],
            "objects": [
                {
                    "class": obj["class_name"],
                    "confidence": obj["confidence"],
                    "priority": obj["priority"],
                    "bbox": obj["bounding_box"]
                }
                for obj in frame_data["objects"]
            ]
        })

    with open(llm_path, "w") as f:
        json.dump({
            "video_id": video_id,
            "total_frames": total_frames,
            "fps": fps,
            "frames": llm_output
        }, f, indent=2)

    print(json.dumps(output))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: detect.py <video_path> <video_id>"}))
        sys.exit(1)

    video_path = sys.argv[1]
    video_id = int(sys.argv[2])
    detect_video(video_path, video_id)
