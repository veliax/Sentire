"""
kmeans_test.py
==============
Testing harness for the YOLOv8 object-detection model used in detect.py.

Performs three analyses:

  1. K-means on bounding boxes
     IoU-distance k-means over every detected (w, h) pair (the classic YOLO
     anchor analysis from Redmon's YOLOv2 paper). Reports avg IoU per k for
     elbow selection, and overlays the chosen centroids on the box scatter.

  2. K-means on detection outputs
     Multi-feature k-means over [cx, cy, w, h, confidence, class_id]
     (normalized + standardized). Selects k via silhouette score, then
     describes each cluster (dominant class, mean confidence, mean size).

  3. Accuracy
     Ultralytics' built-in validation on COCO128 (auto-downloads). Filtered
     to the three classes the system actually uses: person (0), knife (43),
     scissors (76). Reports mAP50, mAP50-95, precision, recall, F1.

Usage
-----
    python kmeans_test.py                          # use ./videos/ as detections root
    python kmeans_test.py --detections-dir DIR     # custom root containing detections.json files
    python kmeans_test.py --skip-accuracy          # skip the COCO128 download/val step
    python kmeans_test.py --output-dir kmeans_results

Outputs
-------
    <output-dir>/
        kmeans_results.json   raw numerical results
        report.md             human-readable summary (for the final report)
        plots/*.png           7 figures (elbow curves, scatter, PCA, etc.)
"""

import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np
import matplotlib

matplotlib.use("Agg")  # no display needed
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler


# Match detect.py
ALLOWED_CLASSES = {0: "person", 43: "knife", 76: "scissors"}
HIGH_PRIORITY = {43, 76}


# ---------------------------------------------------------------------------
# Detection loading
# ---------------------------------------------------------------------------

def load_detections(root: Path):
    """Walk root recursively, collect every box from every detections.json.

    Returns a list of dicts with keys: cx, cy, w, h, confidence, class_id,
    class_name, frame_w, frame_h. Coordinates are absolute pixels at this
    stage; normalization happens in the feature builder.
    """
    boxes = []
    json_files = list(root.rglob("detections.json"))
    if not json_files:
        return boxes, []

    for jf in json_files:
        try:
            with open(jf) as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            print(f"  skipping {jf}: {e}", file=sys.stderr)
            continue

        # detect.py doesn't store frame dims in the JSON; fall back to a
        # sensible default and let the user override via env if needed.
        # Most of their footage is 1920x1080 or 1280x720; default 1920x1080.
        frame_w = data.get("frame_width", 1920)
        frame_h = data.get("frame_height", 1080)

        for frame in data.get("detections", []):
            for obj in frame.get("objects", []):
                bb = obj["bounding_box"]
                w = bb["x2"] - bb["x1"]
                h = bb["y2"] - bb["y1"]
                if w <= 0 or h <= 0:
                    continue
                boxes.append({
                    "cx": (bb["x1"] + bb["x2"]) / 2,
                    "cy": (bb["y1"] + bb["y2"]) / 2,
                    "w": w,
                    "h": h,
                    "confidence": obj["confidence"],
                    "class_id": obj["class_id"],
                    "class_name": obj["class_name"],
                    "frame_w": frame_w,
                    "frame_h": frame_h,
                })

    return boxes, json_files


# ---------------------------------------------------------------------------
# 1. K-means on bounding boxes (IoU-distance)
# ---------------------------------------------------------------------------

def iou_wh(boxes_wh, centers_wh):
    """IoU between (n, 2) box dims and (k, 2) center dims, treating both as
    centered at origin. Returns (n, k)."""
    boxes = np.asarray(boxes_wh)[:, None, :]   # (n, 1, 2)
    centers = np.asarray(centers_wh)[None, :, :]  # (1, k, 2)
    inter = np.minimum(boxes, centers).prod(axis=2)
    union = boxes.prod(axis=2) + centers.prod(axis=2) - inter
    return inter / np.clip(union, 1e-9, None)


def kmeans_iou(boxes_wh, k, n_iter=50, seed=0):
    """K-means with 1 - IoU as the distance metric (Redmon YOLOv2 style)."""
    rng = np.random.default_rng(seed)
    boxes = np.asarray(boxes_wh, dtype=np.float64)
    n = len(boxes)
    centers = boxes[rng.choice(n, k, replace=False)].copy()

    last_assign = np.full(n, -1)
    for _ in range(n_iter):
        ious = iou_wh(boxes, centers)
        assign = ious.argmax(axis=1)
        if np.array_equal(assign, last_assign):
            break
        for j in range(k):
            members = boxes[assign == j]
            if len(members) > 0:
                centers[j] = members.mean(axis=0)
        last_assign = assign

    final_iou = iou_wh(boxes, centers).max(axis=1).mean()
    return centers, assign, float(final_iou)


def analyze_bbox_kmeans(boxes, k_range=(1, 11), out_dir: Path = None):
    """Run IoU k-means for k in range, plot elbow, return summary."""
    boxes_wh = np.array([[b["w"], b["h"]] for b in boxes], dtype=np.float64)
    classes = np.array([b["class_id"] for b in boxes])

    avg_ious = []
    all_centers = {}
    for k in range(*k_range):
        centers, _, miou = kmeans_iou(boxes_wh, k)
        avg_ious.append(miou)
        all_centers[k] = centers.tolist()

    # Elbow via knee point on the IoU curve
    best_k = pick_elbow(list(range(*k_range)), avg_ious, ascending=True)
    best_centers, best_assign, best_miou = kmeans_iou(boxes_wh, best_k)

    # Per-class average IoU at best_k
    per_class = {}
    for cid, cname in ALLOWED_CLASSES.items():
        mask = classes == cid
        if mask.sum() == 0:
            continue
        per_class[cname] = {
            "n": int(mask.sum()),
            "avg_iou": float(iou_wh(boxes_wh[mask], best_centers).max(axis=1).mean()),
            "mean_w": float(boxes_wh[mask, 0].mean()),
            "mean_h": float(boxes_wh[mask, 1].mean()),
        }

    # Plots
    if out_dir is not None:
        # Elbow
        plt.figure(figsize=(7, 4))
        plt.plot(range(*k_range), avg_ious, "o-", color="#2563eb")
        plt.axvline(best_k, color="#dc2626", ls="--", label=f"chosen k = {best_k}")
        plt.xlabel("k (number of clusters)")
        plt.ylabel("Average IoU with assigned centroid")
        plt.title("Elbow analysis — IoU k-means on bounding box (w, h)")
        plt.grid(alpha=0.3)
        plt.legend()
        plt.tight_layout()
        plt.savefig(out_dir / "01_elbow_iou.png", dpi=140)
        plt.close()

        # Anchor scatter
        plt.figure(figsize=(7, 6))
        for cid, cname in ALLOWED_CLASSES.items():
            mask = classes == cid
            if mask.sum() == 0:
                continue
            plt.scatter(boxes_wh[mask, 0], boxes_wh[mask, 1],
                        s=8, alpha=0.4, label=f"{cname} (n={mask.sum()})")
        plt.scatter(best_centers[:, 0], best_centers[:, 1],
                    s=180, marker="X", color="black", edgecolor="white",
                    linewidth=1.5, label="centroids", zorder=5)
        plt.xlabel("box width (px)")
        plt.ylabel("box height (px)")
        plt.title(f"Bounding-box clusters at k={best_k}  (avg IoU = {best_miou:.3f})")
        plt.legend()
        plt.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig(out_dir / "02_anchor_scatter.png", dpi=140)
        plt.close()

    return {
        "k_range": list(range(*k_range)),
        "avg_iou_per_k": avg_ious,
        "chosen_k": int(best_k),
        "chosen_avg_iou": float(best_miou),
        "centroids": [[float(w), float(h)] for w, h in best_centers],
        "per_class": per_class,
        "n_boxes": int(len(boxes)),
    }


# ---------------------------------------------------------------------------
# 2. K-means on detection outputs (multi-feature)
# ---------------------------------------------------------------------------

def analyze_output_kmeans(boxes, k_range=(2, 11), out_dir: Path = None):
    """K-means on [cx_n, cy_n, w_n, h_n, confidence, class_id] feature vector."""
    feats = []
    for b in boxes:
        feats.append([
            b["cx"] / b["frame_w"],
            b["cy"] / b["frame_h"],
            b["w"] / b["frame_w"],
            b["h"] / b["frame_h"],
            b["confidence"],
            float(b["class_id"]),
        ])
    X = np.array(feats)
    Xs = StandardScaler().fit_transform(X)

    sil_scores = []
    inertias = []
    ks = list(range(*k_range))
    for k in ks:
        km = KMeans(n_clusters=k, random_state=0, n_init=10)
        labels = km.fit_predict(Xs)
        inertias.append(float(km.inertia_))
        # silhouette undefined for k=1
        if k > 1 and len(set(labels)) > 1:
            sil_scores.append(float(silhouette_score(Xs, labels, sample_size=min(5000, len(Xs)), random_state=0)))
        else:
            sil_scores.append(float("nan"))

    # Pick k by max silhouette (ignoring NaN)
    valid = [(k, s) for k, s in zip(ks, sil_scores) if not np.isnan(s)]
    best_k = max(valid, key=lambda kv: kv[1])[0] if valid else ks[0]

    # Refit at best k for cluster descriptions
    km_final = KMeans(n_clusters=best_k, random_state=0, n_init=10)
    labels = km_final.fit_predict(Xs)

    cluster_summary = []
    for c in range(best_k):
        mask = labels == c
        if mask.sum() == 0:
            continue
        member_classes = [boxes[i]["class_name"] for i in np.where(mask)[0]]
        member_conf = [boxes[i]["confidence"] for i in np.where(mask)[0]]
        member_w = [boxes[i]["w"] / boxes[i]["frame_w"] for i in np.where(mask)[0]]
        member_h = [boxes[i]["h"] / boxes[i]["frame_h"] for i in np.where(mask)[0]]
        unique, counts = np.unique(member_classes, return_counts=True)
        dominant = unique[counts.argmax()]
        cluster_summary.append({
            "cluster": int(c),
            "size": int(mask.sum()),
            "share": float(mask.sum() / len(labels)),
            "dominant_class": str(dominant),
            "class_distribution": {str(u): int(c_) for u, c_ in zip(unique, counts)},
            "mean_confidence": float(np.mean(member_conf)),
            "mean_w_norm": float(np.mean(member_w)),
            "mean_h_norm": float(np.mean(member_h)),
        })

    if out_dir is not None:
        # Silhouette curve
        plt.figure(figsize=(7, 4))
        plt.plot(ks, sil_scores, "o-", color="#16a34a")
        plt.axvline(best_k, color="#dc2626", ls="--", label=f"chosen k = {best_k}")
        plt.xlabel("k (number of clusters)")
        plt.ylabel("Silhouette score")
        plt.title("Silhouette analysis — k-means on detection outputs")
        plt.grid(alpha=0.3)
        plt.legend()
        plt.tight_layout()
        plt.savefig(out_dir / "03_elbow_silhouette.png", dpi=140)
        plt.close()

        # PCA scatter
        pca = PCA(n_components=2, random_state=0)
        Xp = pca.fit_transform(Xs)
        plt.figure(figsize=(8, 6))
        cmap = plt.cm.tab10
        for c in range(best_k):
            mask = labels == c
            plt.scatter(Xp[mask, 0], Xp[mask, 1], s=10, alpha=0.6,
                        color=cmap(c % 10), label=f"cluster {c} (n={mask.sum()})")
        plt.xlabel(f"PC1 ({pca.explained_variance_ratio_[0]*100:.1f}% var)")
        plt.ylabel(f"PC2 ({pca.explained_variance_ratio_[1]*100:.1f}% var)")
        plt.title(f"Detection-output clusters in 2D (k={best_k})")
        plt.legend(loc="best", fontsize=8)
        plt.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig(out_dir / "04_output_clusters_pca.png", dpi=140)
        plt.close()

        # Class distribution + confidence histogram
        plt.figure(figsize=(7, 4))
        all_classes = [b["class_name"] for b in boxes]
        unique, counts = np.unique(all_classes, return_counts=True)
        plt.bar(unique, counts, color=["#16a34a", "#dc2626", "#dc2626"][: len(unique)])
        plt.ylabel("# detections")
        plt.title("Detection count per class")
        plt.tight_layout()
        plt.savefig(out_dir / "05_class_distribution.png", dpi=140)
        plt.close()

        plt.figure(figsize=(7, 4))
        for cid, cname in ALLOWED_CLASSES.items():
            confs = [b["confidence"] for b in boxes if b["class_id"] == cid]
            if confs:
                plt.hist(confs, bins=20, alpha=0.5, label=f"{cname} (n={len(confs)})")
        plt.xlabel("Confidence score")
        plt.ylabel("# detections")
        plt.title("Confidence distribution per class")
        plt.legend()
        plt.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig(out_dir / "06_confidence_distribution.png", dpi=140)
        plt.close()

    return {
        "k_range": ks,
        "silhouette_per_k": sil_scores,
        "inertia_per_k": inertias,
        "chosen_k": int(best_k),
        "clusters": cluster_summary,
    }


# ---------------------------------------------------------------------------
# 3. Accuracy via Ultralytics validation
# ---------------------------------------------------------------------------

def run_accuracy(out_dir: Path = None, weights="yolov8s.pt", data="coco128.yaml"):
    """Run ultralytics .val() and extract metrics for our three classes."""
    try:
        from ultralytics import YOLO
    except ImportError:
        return {"error": "ultralytics not installed"}

    model = YOLO(weights)
    # classes filter restricts evaluation to person, knife, scissors
    metrics = model.val(
        data=data,
        classes=list(ALLOWED_CLASSES.keys()),
        verbose=False,
        save_json=False,
        plots=False,
    )

    box = metrics.box
    overall = {
        "mAP50": float(box.map50),
        "mAP50-95": float(box.map),
        "precision": float(box.mp),
        "recall": float(box.mr),
        "f1": float(2 * box.mp * box.mr / (box.mp + box.mr + 1e-9)),
    }

    # Per-class — ultralytics returns arrays aligned to box.ap_class_index
    per_class = {}
    try:
        ap_idx = list(box.ap_class_index)
        # box.p / box.r / box.f1 / box.map50 / box.maps are per-class arrays
        for i, cid in enumerate(ap_idx):
            cname = ALLOWED_CLASSES.get(int(cid), f"class_{int(cid)}")
            per_class[cname] = {
                "precision": float(box.p[i]) if len(box.p) > i else None,
                "recall": float(box.r[i]) if len(box.r) > i else None,
                "f1": float(box.f1[i]) if len(box.f1) > i else None,
                "mAP50": float(box.ap50[i]) if hasattr(box, "ap50") and len(box.ap50) > i else None,
                "mAP50-95": float(box.maps[int(cid)]) if int(cid) < len(box.maps) else None,
            }
    except Exception as e:
        per_class["_warning"] = f"per-class extraction failed: {e}"

    # Bar plot of overall metrics
    if out_dir is not None:
        plt.figure(figsize=(7, 4))
        keys = ["precision", "recall", "f1", "mAP50", "mAP50-95"]
        vals = [overall["precision"], overall["recall"], overall["f1"],
                overall["mAP50"], overall["mAP50-95"]]
        plt.bar(keys, vals, color="#2563eb")
        for i, v in enumerate(vals):
            plt.text(i, v + 0.01, f"{v:.3f}", ha="center", fontsize=9)
        plt.ylim(0, 1.05)
        plt.ylabel("score")
        plt.title(f"YOLOv8s accuracy on {data} (filtered to person/knife/scissors)")
        plt.grid(alpha=0.3, axis="y")
        plt.tight_layout()
        plt.savefig(out_dir / "07_accuracy.png", dpi=140)
        plt.close()

    return {"dataset": data, "weights": weights, "overall": overall, "per_class": per_class}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def pick_elbow(ks, ys, ascending=True):
    """Pick the 'knee' of a curve via max distance to the chord between the
    first and last points. Works for both monotonically rising (IoU) and
    falling (inertia) curves."""
    ks = np.asarray(ks, dtype=float)
    ys = np.asarray(ys, dtype=float)
    if len(ks) < 3:
        return int(ks[0])
    p1 = np.array([ks[0], ys[0]])
    p2 = np.array([ks[-1], ys[-1]])
    line = p2 - p1
    line_norm = line / np.linalg.norm(line)
    dists = []
    for k, y in zip(ks, ys):
        v = np.array([k, y]) - p1
        proj = v - (v @ line_norm) * line_norm
        dists.append(np.linalg.norm(proj))
    return int(ks[int(np.argmax(dists))])


def write_report(results, out_path: Path):
    """Compose a markdown report fit for inclusion in the final report."""
    bb = results["bbox_kmeans"]
    out = results["output_kmeans"]
    acc = results["accuracy"]

    lines = [
        "# K-means and accuracy testing of the YOLOv8s detection model",
        "",
        f"Total detections analyzed: **{bb['n_boxes']}** "
        f"(across {results['n_videos']} processed videos).",
        "",
        "## 1. K-means clustering on bounding boxes",
        "",
        f"IoU-distance k-means on every detected (width, height) pair. "
        f"Elbow analysis selected **k = {bb['chosen_k']}**, "
        f"achieving an average IoU of **{bb['chosen_avg_iou']:.3f}** between "
        "every box and its assigned centroid. Higher avg IoU means the chosen "
        "anchor sizes cover the actual detected box shapes more tightly.",
        "",
        "**Centroids (w, h) at the chosen k:**",
        "",
    ]
    for w, h in bb["centroids"]:
        lines.append(f"- {w:.1f} × {h:.1f} px")
    lines.append("")
    lines.append("**Per-class fit:**")
    lines.append("")
    lines.append("| class | n | mean w (px) | mean h (px) | avg IoU |")
    lines.append("|---|---|---|---|---|")
    for cname, st in bb["per_class"].items():
        lines.append(f"| {cname} | {st['n']} | {st['mean_w']:.1f} | {st['mean_h']:.1f} | {st['avg_iou']:.3f} |")
    lines.append("")
    lines.append("See `plots/01_elbow_iou.png` and `plots/02_anchor_scatter.png`.")
    lines.append("")

    lines += [
        "## 2. K-means clustering on detection outputs",
        "",
        f"Standardized k-means on the feature vector "
        f"`[cx, cy, w, h, confidence, class_id]`. Silhouette analysis selected "
        f"**k = {out['chosen_k']}**.",
        "",
        "**Cluster profiles:**",
        "",
        "| cluster | size | share | dominant class | mean conf | mean w | mean h |",
        "|---|---|---|---|---|---|---|",
    ]
    for c in out["clusters"]:
        lines.append(
            f"| {c['cluster']} | {c['size']} | {c['share']*100:.1f}% | "
            f"{c['dominant_class']} | {c['mean_confidence']:.3f} | "
            f"{c['mean_w_norm']:.3f} | {c['mean_h_norm']:.3f} |"
        )
    lines.append("")
    lines.append("Sizes are normalized to frame dimensions. "
                 "See `plots/03_elbow_silhouette.png` and `plots/04_output_clusters_pca.png`.")
    lines.append("")

    if "error" in acc:
        lines += ["## 3. Accuracy", "", f"Skipped or failed: {acc['error']}", ""]
    else:
        ov = acc["overall"]
        lines += [
            "## 3. Accuracy",
            "",
            f"Validation on `{acc['dataset']}` with weights `{acc['weights']}`, "
            "filtered to the three classes the system uses.",
            "",
            "| metric | value |",
            "|---|---|",
            f"| Precision | {ov['precision']:.3f} |",
            f"| Recall | {ov['recall']:.3f} |",
            f"| F1 | {ov['f1']:.3f} |",
            f"| mAP@0.5 | {ov['mAP50']:.3f} |",
            f"| mAP@0.5–0.95 | {ov['mAP50-95']:.3f} |",
            "",
            "**Per class:**",
            "",
            "| class | precision | recall | F1 | mAP@0.5 | mAP@0.5–0.95 |",
            "|---|---|---|---|---|---|",
        ]
        for cname, m in acc["per_class"].items():
            if cname.startswith("_"):
                continue
            def f(x):
                return f"{x:.3f}" if isinstance(x, float) else "—"
            lines.append(
                f"| {cname} | {f(m.get('precision'))} | {f(m.get('recall'))} | "
                f"{f(m.get('f1'))} | {f(m.get('mAP50'))} | {f(m.get('mAP50-95'))} |"
            )
        lines.append("")
        lines.append("See `plots/07_accuracy.png`.")
        lines.append("")

    out_path.write_text("\n".join(lines))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--detections-dir", default="videos",
                   help="root directory containing detections.json files (default: ./videos)")
    p.add_argument("--output-dir", default="kmeans_results",
                   help="where to write report + plots (default: ./kmeans_results)")
    p.add_argument("--skip-accuracy", action="store_true",
                   help="skip the COCO128 download/validation step")
    p.add_argument("--weights", default="yolov8s.pt",
                   help="model weights for accuracy test (default: yolov8s.pt)")
    p.add_argument("--data", default="coco128.yaml",
                   help="ultralytics data yaml for accuracy (default: coco128.yaml)")
    args = p.parse_args()

    out_dir = Path(args.output_dir)
    plots_dir = out_dir / "plots"
    plots_dir.mkdir(parents=True, exist_ok=True)

    # Load
    print(f"[1/4] Loading detections from {args.detections_dir} ...")
    boxes, json_files = load_detections(Path(args.detections_dir))
    print(f"      found {len(json_files)} detections.json files, {len(boxes)} boxes")
    if len(boxes) < 10:
        print("      WARNING: fewer than 10 detections — k-means results will be unreliable.")
        if len(boxes) == 0:
            print("      Run detect.py on some videos first, then re-run this script.")
            sys.exit(1)

    # 1. bbox k-means
    print("[2/4] K-means on bounding boxes (IoU distance)...")
    bbox_results = analyze_bbox_kmeans(boxes, k_range=(1, 11), out_dir=plots_dir)
    print(f"      chosen k = {bbox_results['chosen_k']}, avg IoU = {bbox_results['chosen_avg_iou']:.3f}")

    # 2. output k-means
    print("[3/4] K-means on detection outputs (multi-feature)...")
    out_results = analyze_output_kmeans(boxes, k_range=(2, 11), out_dir=plots_dir)
    print(f"      chosen k = {out_results['chosen_k']} (silhouette)")

    # 3. accuracy
    if args.skip_accuracy:
        print("[4/4] Skipping accuracy step (--skip-accuracy).")
        acc_results = {"error": "skipped by user"}
    else:
        print(f"[4/4] Running ultralytics validation on {args.data} ...")
        try:
            acc_results = run_accuracy(plots_dir, weights=args.weights, data=args.data)
            if "overall" in acc_results:
                ov = acc_results["overall"]
                print(f"      mAP50={ov['mAP50']:.3f}  mAP50-95={ov['mAP50-95']:.3f}  "
                      f"P={ov['precision']:.3f}  R={ov['recall']:.3f}")
        except Exception as e:
            acc_results = {"error": f"{type(e).__name__}: {e}"}
            print(f"      FAILED: {acc_results['error']}")

    results = {
        "n_videos": len(json_files),
        "bbox_kmeans": bbox_results,
        "output_kmeans": out_results,
        "accuracy": acc_results,
    }

    with open(out_dir / "kmeans_results.json", "w") as f:
        json.dump(results, f, indent=2)
    write_report(results, out_dir / "report.md")

    print(f"\nDone. Results written to {out_dir.resolve()}")
    print(f"  - kmeans_results.json")
    print(f"  - report.md")
    print(f"  - plots/ ({len(list(plots_dir.glob('*.png')))} figures)")


if __name__ == "__main__":
    main()
