#!/usr/bin/env python3
"""
Compute MSE, PSNR, SSIM (fast) for two images and output JSON.
Usage: python metrics.py input.jpg output.jpg
"""
import sys
import json
import math
import cv2
import numpy as np


def compute_mse(original, enhanced):
    original = original.astype(np.float32)
    enhanced = enhanced.astype(np.float32)
    return float(np.mean((original - enhanced) ** 2))


def compute_psnr(original, enhanced):
    mse = compute_mse(original, enhanced)
    if mse == 0:
        return float('inf')
    return 20.0 * math.log10(255.0 / math.sqrt(mse))


def compute_ssim_fast(original, enhanced, window_size=11):
    """
    Simple SSIM using only NumPy + OpenCV on 3-channel images.
    """
    if original.ndim == 2:
        original = np.stack([original] * 3, axis=-1)
    if enhanced.ndim == 2:
        enhanced = np.stack([enhanced] * 3, axis=-1)

    if original.shape[2] > 3:
        original = original[:, :, :3]
    if enhanced.shape[2] > 3:
        enhanced = enhanced[:, :, :3]

    x = original.astype(np.float32)
    y = enhanced.astype(np.float32)

    C1 = (0.01 * 255.0) ** 2
    C2 = (0.03 * 255.0) ** 2

    def gblur(img):
        return cv2.GaussianBlur(img, (window_size, window_size), 1.5)

    ssim_vals = []
    for c in range(3):
        x_c = x[..., c]
        y_c = y[..., c]

        mu_x = gblur(x_c)
        mu_y = gblur(y_c)

        mu_x2 = mu_x * mu_x
        mu_y2 = mu_y * mu_y
        mu_xy = mu_x * mu_y

        sigma_x2 = gblur(x_c * x_c) - mu_x2
        sigma_y2 = gblur(y_c * y_c) - mu_y2
        sigma_xy = gblur(x_c * y_c) - mu_xy

        num = (2.0 * mu_xy + C1) * (2.0 * sigma_xy + C2)
        den = (mu_x2 + mu_y2 + C1) * (sigma_x2 + sigma_y2 + C2)

        ssim_map = num / (den + 1e-12)
        ssim_vals.append(float(ssim_map.mean()))

    return float(np.mean(ssim_vals))


def main():
    try:
        if len(sys.argv) < 3:
            error_msg = json.dumps({"error": "Usage: metrics.py input.jpg output.jpg"})
            print(error_msg, file=sys.stderr)
            print(error_msg)
            sys.exit(1)

        input_path = sys.argv[1]
        output_path = sys.argv[2]

        a = cv2.imread(input_path)
        b = cv2.imread(output_path)

        if a is None or b is None:
            error_msg = json.dumps({"error": "Could not read one of the images"})
            print(error_msg, file=sys.stderr)
            print(error_msg)
            sys.exit(1)

        # Resize enhanced to original if sizes differ for fair comparison
        if a.shape != b.shape:
            try:
                b = cv2.resize(b, (a.shape[1], a.shape[0]), interpolation=cv2.INTER_AREA)
            except Exception as resize_err:
                # Log resize error to stderr but continue
                print(f"Warning: Resize failed: {resize_err}", file=sys.stderr)

        mse = compute_mse(a, b)
        psnr = compute_psnr(a, b)
        ssim = compute_ssim_fast(a, b)

        # Handle infinite PSNR
        if not math.isfinite(psnr):
            psnr = 100.0  # Set to a high value for identical images

        out = {
            "mse": mse,
            "psnr": psnr,
            "ssim": ssim
        }

        # Output JSON to stdout only (stderr can have warnings)
        print(json.dumps(out))
        sys.stdout.flush()
        
    except Exception as e:
        error_msg = json.dumps({"error": f"Metrics calculation failed: {str(e)}"})
        print(error_msg, file=sys.stderr)
        print(error_msg)
        sys.exit(1)


if __name__ == '__main__':
    main()
