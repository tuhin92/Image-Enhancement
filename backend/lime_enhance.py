#!/usr/bin/env python3
"""
LIME (Low-Light Image Enhancement) Algorithm Implementation
This script enhances low-light images using the LIME algorithm.
"""

import cv2
import numpy as np
import sys
import os
from PIL import Image
import argparse

def guided_filter(guide, src, radius, eps):
    """
    Apply guided filter to the image.
    
    Args:
        guide: Guidance image
        src: Source image
        radius: Filter radius
        eps: Regularization parameter
    
    Returns:
        Filtered image
    """
    # Use OpenCV's guided filter if available
    if hasattr(cv2, 'ximgproc'):
        return cv2.ximgproc.guidedFilter(guide, src, radius, eps)
    else:
        # Fallback implementation if ximgproc is not available
        return cv2.bilateralFilter(src, radius, eps, eps)

def estimate_illumination_map(img, alpha=0.15, beta=0.08):
    """
    Estimate the illumination map from the input image.
    
    Args:
        img: Input image (BGR format)
        alpha: Parameter for illumination estimation
        beta: Parameter for illumination estimation
    
    Returns:
        Estimated illumination map
    """
    # Convert to LAB color space
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel = lab[:, :, 0]
    
    # Normalize L channel
    l_norm = l_channel.astype(np.float32) / 255.0
    
    # Estimate illumination map using the maximum value in RGB channels
    b, g, r = cv2.split(img)
    max_rgb = np.maximum(np.maximum(r, g), b).astype(np.float32) / 255.0
    
    # Apply guided filter to smooth the illumination map
    illumination = guided_filter(l_norm, max_rgb, 40, 0.001)
    
    # Apply gamma correction
    illumination = np.power(illumination, alpha)
    
    # Add small constant to avoid division by zero
    illumination = np.maximum(illumination, beta)
    
    return illumination

def enhance_low_light_image(img, alpha=0.15, beta=0.08, gamma=0.8):
    """
    Enhance low-light image using LIME algorithm.
    
    Args:
        img: Input image (BGR format)
        alpha: Parameter for illumination estimation
        beta: Parameter for illumination estimation
        gamma: Gamma correction parameter
    
    Returns:
        Enhanced image
    """
    # Estimate illumination map
    illumination = estimate_illumination_map(img, alpha, beta)
    
    # Normalize input image
    img_norm = img.astype(np.float32) / 255.0
    
    # Enhance image by dividing by illumination map
    enhanced = img_norm / np.stack([illumination] * 3, axis=2)
    
    # Apply gamma correction
    enhanced = np.power(enhanced, gamma)
    
    # Clip values to [0, 1] range
    enhanced = np.clip(enhanced, 0, 1)
    
    # Convert back to uint8
    enhanced = (enhanced * 255).astype(np.uint8)
    
    return enhanced

def main():
    """
    Main function to process command line arguments and enhance image.
    """
    parser = argparse.ArgumentParser(description='LIME Low-Light Image Enhancement')
    parser.add_argument('input_path', help='Path to input image')
    parser.add_argument('output_path', help='Path to save enhanced image')
    parser.add_argument('--alpha', type=float, default=0.15, help='Alpha parameter (default: 0.15)')
    parser.add_argument('--beta', type=float, default=0.08, help='Beta parameter (default: 0.08)')
    parser.add_argument('--gamma', type=float, default=0.8, help='Gamma correction (default: 0.8)')
    
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
        print("Enhancing image using LIME algorithm...")
        enhanced_img = enhance_low_light_image(
            img, 
            alpha=args.alpha, 
            beta=args.beta, 
            gamma=args.gamma
        )
        
        # Save enhanced image
        print(f"Saving enhanced image to: {args.output_path}")
        success = cv2.imwrite(args.output_path, enhanced_img)
        
        if success:
            print("Image enhancement completed successfully!")
        else:
            print(f"Error: Could not save enhanced image to '{args.output_path}'")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error during image processing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 