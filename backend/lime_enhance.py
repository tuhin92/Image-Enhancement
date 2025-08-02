#!/usr/bin/env python3
"""
Enhanced LIME (Low-Light Image Enhancement) Algorithm Implementation
This script enhances low-light images using an improved LIME algorithm.
"""

import cv2
import numpy as np
import sys
import os
import logging
import argparse
from PIL import Image

# Configure logging for better debugging and monitoring
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def estimate_illumination(img, method='max_rgb', sigma=3):
    """
    Estimate the illumination map using different methods and apply soft smoothing.
    Options for 'method': 'max_rgb', 'luminosity', 'gray'.
    """
    img = img.astype(np.float32) / 255.0

    if method == 'max_rgb':
        illumination = np.max(img, axis=2)
    elif method == 'luminosity':
        illumination = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)[:, :, 2]
    elif method == 'gray':
        illumination = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    else:
        raise ValueError(f"Unknown method: {method}. Available methods are: 'max_rgb', 'luminosity', 'gray'.")

    # Optionally, reduce the smoothing impact
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
    """
    img = img.astype(np.float32) / 255.0
    enhanced = np.zeros_like(img)

    # Apply gamma correction for a smoother, more natural brightness boost
    for i in range(3):
        enhanced[:, :, i] = (img[:, :, i] / illumination) ** gamma

    # Normalize and scale back to valid image range
    enhanced = np.clip(enhanced * 255.0, 0, 255).astype(np.uint8)

    # Optionally sharpen the image
    enhanced = sharpen_image(enhanced)

    return enhanced

def lime_enhance(image_path, output_path, illumination_method='max_rgb', gamma=0.85, sigma=3, radius=15, eps=1e-3):
    """
    Apply LIME enhancement to an image with improved realism and flexibility.
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            logging.warning(f"Skipping {image_path} - Unable to load image.")
            return False

        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Step 1: Estimate Illumination
        illumination = estimate_illumination(img, method=illumination_method, sigma=sigma)

        # Step 2: Refine Illumination using Guided Filtering
        refined_illumination = refine_illumination(illumination, radius=radius, eps=eps)

        # Step 3: Enhance Image using Gamma Correction and Sharpening
        enhanced_img = enhance_image(img, refined_illumination, gamma=gamma)

        # Save the output
        output_image = Image.fromarray(enhanced_img)
        output_image.save(output_path)
        logging.info(f"Enhanced Image Saved: {output_path}")
        return True

    except Exception as e:
        logging.error(f"Error processing {image_path}: {e}")
        return False

def main():
    """
    Main function to process command line arguments and enhance image.
    """
    parser = argparse.ArgumentParser(description='Enhanced LIME Low-Light Image Enhancement')
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
        print("Enhancing image using improved LIME algorithm...")
        success = lime_enhance(
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