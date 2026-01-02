#!/usr/bin/env python3
"""
Hybrid LIME + Zero-DCE Image Enhancement Algorithm Implementation
This script enhances low-light images using a hybrid approach combining LIME and Zero-DCE techniques.
"""

import cv2
import numpy as np
import sys
import os
import logging
import argparse

# Configure logging for better debugging and monitoring
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def estimate_illumination(img, method='max_rgb', sigma=3):
    """
    Estimate the illumination map using different methods and apply soft smoothing.
    Options for 'method': 'max_rgb', 'luminosity', 'gray'.
    Note: Expects BGR image from OpenCV.
    """
    img_float = img.astype(np.float32) / 255.0

    if method == 'max_rgb':
        illumination = np.max(img_float, axis=2)
    elif method == 'luminosity':
        illumination = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[:, :, 2].astype(np.float32) / 255.0
    elif method == 'gray':
        illumination = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    else:
        raise ValueError(f"Unknown method: {method}. Available methods are: 'max_rgb', 'luminosity', 'gray'.")

    # Apply Gaussian blur only if sigma > 0
    if sigma > 0:
        illumination = cv2.GaussianBlur(illumination, (5, 5), sigma)

    # Normalize illumination map (to prevent extreme brightness shifts)
    illumination = np.clip(illumination, 0.1, 1.0)

    return illumination

def sharpen_image(img, alpha=1.5, beta=0.5):
    """
    Apply sharpening using an unsharp mask or custom kernel.
    """
    kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])  # Sharpening kernel
    sharpened = cv2.filter2D(img, -1, kernel)
    return sharpened

def refine_illumination(illumination, radius=15, eps=1e-3):
    """
    Use guided filtering for structure-preserving smoothing with adaptive radius and eps.
    """
    try:
        refined_illumination = cv2.ximgproc.guidedFilter(
            guide=illumination.astype(np.float32),
            src=illumination.astype(np.float32),
            radius=radius,
            eps=eps
        )
        return np.clip(refined_illumination, 0.1, 1.0)
    except AttributeError:
        # Fallback if ximgproc is not available
        logging.warning("ximgproc not available, using bilateral filter as fallback")
        refined_illumination = cv2.bilateralFilter(illumination.astype(np.float32), 15, 75, 75)
        return np.clip(refined_illumination, 0.1, 1.0)

def enhance_image(img, illumination, gamma=0.85):
    """
    Realistic enhancement by applying adaptive gamma correction.
    Expects BGR image, returns BGR image.
    """
    img_float = img.astype(np.float32) / 255.0
    
    # Vectorized gamma correction - much faster than loop
    illumination_3d = illumination[:, :, np.newaxis]
    enhanced = np.power(img_float / illumination_3d, gamma)

    # Normalize and scale back to valid image range
    enhanced = np.clip(enhanced * 255.0, 0, 255).astype(np.uint8)

    # Inline sharpening for better performance
    kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]], dtype=np.float32)
    enhanced = cv2.filter2D(enhanced, -1, kernel)

    return enhanced

def hybrid_enhance(image_path, output_path, illumination_method='max_rgb', gamma=1.0, sigma=3, radius=15, eps=1e-3, max_gain=5.0, denoise_strength=10, saturation_scale=1.0):
    """
    Apply Hybrid LIME + Zero-DCE enhancement to an image with improved realism and flexibility.
    Optimized version: works in BGR color space throughout to avoid conversions.
    Parameters:
        image_path: str
        output_path: str
        illumination_method: str
        gamma: float
        sigma: float
        radius: int
        eps: float
        max_gain: float (limits how much dark areas are brightened)
        denoise_strength: int (strength for denoising filter)
        saturation_scale: float (scales the saturation after enhancement)
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            logging.warning(f"Skipping {image_path} - Unable to load image.")
            return False

        # Work in BGR throughout - no conversion needed
        # Step 1: Estimate Illumination
        illumination = estimate_illumination(img, method=illumination_method, sigma=sigma)
        # Clamp illumination to avoid over-brightening (max_gain) - single clip
        illumination = np.clip(illumination, 1.0 / max_gain, 1.0)

        # Step 2: Refine Illumination using Guided Filtering
        refined_illumination = refine_illumination(illumination, radius=radius, eps=eps)
        # Already clamped in step 1, no need to clip again unless refine changes range significantly

        # Step 3: Enhance Image using Gamma Correction and Sharpening
        enhanced_img = enhance_image(img, refined_illumination, gamma=gamma)

        # Step 4: Fast Denoising - use bilateral filter (much faster than NlMeans)
        if denoise_strength > 0:
            # Bilateral filter is 10-20x faster than fastNlMeansDenoisingColored
            d = min(denoise_strength, 9)  # diameter
            sigmaColor = denoise_strength * 2
            sigmaSpace = denoise_strength * 2
            enhanced_img = cv2.bilateralFilter(enhanced_img, d, sigmaColor, sigmaSpace)

        # Step 5: Adjust Saturation
        if saturation_scale != 1.0:
            hsv = cv2.cvtColor(enhanced_img, cv2.COLOR_BGR2HSV)
            hsv[:, :, 1] = np.clip(hsv[:, :, 1].astype(np.float32) * saturation_scale, 0, 255).astype(np.uint8)
            enhanced_img = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

        # Step 6: Blend with original for natural look (80% enhanced, 20% original)
        enhanced_img = cv2.addWeighted(enhanced_img, 0.8, img, 0.2, 0)

        # Save the output using OpenCV (faster than PIL)
        cv2.imwrite(output_path, enhanced_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        logging.info(f"Enhanced Image Saved: {output_path}")
        return True

    except Exception as e:
        logging.error(f"Error processing {image_path}: {e}")
        return False

def main():
    """
    Main function to process command line arguments and enhance image.
    """
    parser = argparse.ArgumentParser(description='Hybrid LIME + Zero-DCE Low-Light Image Enhancement')
    parser.add_argument('input_path', help='Path to input image')
    parser.add_argument('output_path', help='Path to save enhanced image')
    parser.add_argument('--method', type=str, default='max_rgb', 
                       choices=['max_rgb', 'luminosity', 'gray'],
                       help='Illumination estimation method (default: max_rgb)')
    parser.add_argument('--gamma', type=float, default=0.85, help='Gamma correction (default: 0.85)')
    parser.add_argument('--sigma', type=float, default=3, help='Gaussian blur sigma (default: 3)')
    parser.add_argument('--radius', type=int, default=15, help='Guided filter radius (default: 15)')
    parser.add_argument('--eps', type=float, default=1e-3, help='Guided filter epsilon (default: 1e-3)')
    
    args = parser.parse_args()
    
    # Check if input file exists
    if not os.path.exists(args.input_path):
        print(f"Error: Input file '{args.input_path}' does not exist.")
        sys.exit(1)
    
    try:
        # Read input image
        print(f"Reading image from: {args.input_path}")
        img = cv2.imread(args.input_path)
        
        if img is None:
            print(f"Error: Could not read image from '{args.input_path}'")
            sys.exit(1)
        
        print(f"Image shape: {img.shape}")
        
        # Enhance the image
        print("Enhancing image using Hybrid LIME + Zero-DCE algorithm...")
        success = hybrid_enhance(
            args.input_path, 
            args.output_path,
            illumination_method=args.method,
            gamma=args.gamma,
            sigma=args.sigma,
            radius=args.radius,
            eps=args.eps
        )
        
        if success:
            print("Image enhancement completed successfully!")
        else:
            print(f"Error: Could not enhance image")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error during image processing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 