# K-means and accuracy testing of the YOLOv8s detection model

Total detections analyzed: **2125** (across 12 processed videos).

## 1. K-means clustering on bounding boxes

IoU-distance k-means on every detected (width, height) pair. Elbow analysis selected **k = 4**, achieving an average IoU of **0.692** between every box and its assigned centroid. Higher avg IoU means the chosen anchor sizes cover the actual detected box shapes more tightly.

**Centroids (w, h) at the chosen k:**

- 15.1 × 45.6 px
- 461.4 × 480.8 px
- 43.1 × 93.5 px
- 74.5 × 136.5 px

**Per-class fit:**

| class | n | mean w (px) | mean h (px) | avg IoU |
|---|---|---|---|---|
| person | 2125 | 73.2 | 124.9 | 0.692 |

See `plots/01_elbow_iou.png` and `plots/02_anchor_scatter.png`.

## 2. K-means clustering on detection outputs

Standardized k-means on the feature vector `[cx, cy, w, h, confidence, class_id]`. Silhouette analysis selected **k = 2**.

**Cluster profiles:**

| cluster | size | share | dominant class | mean conf | mean w | mean h |
|---|---|---|---|---|---|---|
| 0 | 2030 | 95.5% | person | 0.735 | 0.028 | 0.100 |
| 1 | 95 | 4.5% | person | 0.775 | 0.247 | 0.454 |

Sizes are normalized to frame dimensions. See `plots/03_elbow_silhouette.png` and `plots/04_output_clusters_pca.png`.

## 3. Accuracy

Validation on `coco128.yaml` with weights `yolov8s.pt`, filtered to the three classes the system uses.

| metric | value |
|---|---|
| Precision | 0.906 |
| Recall | 0.468 |
| F1 | 0.617 |
| mAP@0.5 | 0.548 |
| mAP@0.5–0.95 | 0.398 |

**Per class:**

| class | precision | recall | F1 | mAP@0.5 | mAP@0.5–0.95 |
|---|---|---|---|---|---|
| person | 0.862 | 0.717 | 0.783 | 0.825 | 0.618 |
| knife | 0.855 | 0.688 | 0.762 | 0.819 | 0.575 |
| scissors | 1.000 | 0.000 | 0.000 | 0.000 | 0.000 |

See `plots/07_accuracy.png`.
