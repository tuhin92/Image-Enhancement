#!/usr/bin/env python3
"""
Test script to verify Python dependencies are properly installed.
Run this script to check if all required libraries are available.
"""

import sys

def test_imports():
    """Test if all required libraries can be imported."""
    print("Testing Python dependencies...")
    
    try:
        import cv2
        print(f"✓ OpenCV version: {cv2.__version__}")
        
        # Test if ximgproc is available
        if hasattr(cv2, 'ximgproc'):
            print("✓ OpenCV ximgproc module available")
        else:
            print("⚠ OpenCV ximgproc module not available (will use fallback)")
            
    except ImportError as e:
        print(f"✗ OpenCV import failed: {e}")
        return False
    
    try:
        import numpy as np
        print(f"✓ NumPy version: {np.__version__}")
    except ImportError as e:
        print(f"✗ NumPy import failed: {e}")
        return False
    
    try:
        from PIL import Image
        print(f"✓ PIL version: {Image.__version__}")
    except ImportError as e:
        print(f"✗ PIL import failed: {e}")
        return False
    
    return True

def test_opencv_functionality():
    """Test basic OpenCV functionality."""
    print("\nTesting OpenCV functionality...")
    
    try:
        import cv2
        import numpy as np
        
        # Create a test image
        test_img = np.zeros((100, 100, 3), dtype=np.uint8)
        test_img[25:75, 25:75] = [255, 255, 255]  # White square
        
        # Test basic operations
        gray = cv2.cvtColor(test_img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        print("✓ Basic OpenCV operations working")
        
        # Test guided filter if available
        if hasattr(cv2, 'ximgproc'):
            try:
                guided = cv2.ximgproc.guidedFilter(gray.astype(np.float32), 
                                                  gray.astype(np.float32), 
                                                  5, 0.1)
                print("✓ Guided filter working")
            except Exception as e:
                print(f"⚠ Guided filter test failed: {e}")
        else:
            print("⚠ Guided filter not available (will use bilateral filter)")
            
        return True
        
    except Exception as e:
        print(f"✗ OpenCV functionality test failed: {e}")
        return False

def main():
    """Main test function."""
    print("=" * 50)
    print("Python Setup Test for LIME Image Enhancement Tool")
    print("=" * 50)
    
    # Test imports
    imports_ok = test_imports()
    
    if imports_ok:
        # Test functionality
        functionality_ok = test_opencv_functionality()
        
        print("\n" + "=" * 50)
        if functionality_ok:
            print("✓ All tests passed! Your Python setup is ready.")
            print("You can now run the LIME enhancement tool.")
        else:
            print("✗ Some functionality tests failed.")
            print("Please check your OpenCV installation.")
    else:
        print("\n" + "=" * 50)
        print("✗ Import tests failed.")
        print("Please install the required dependencies:")
        print("pip install -r requirements.txt")
    
    print("=" * 50)

if __name__ == "__main__":
    main() 