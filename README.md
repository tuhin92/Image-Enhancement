# LIME Image Enhancement Tool

A research tool for low-light image enhancement using the LIME (Low-Light Image Enhancement) algorithm. This tool provides a web interface built with Next.js and a Python backend for image processing.

## Features

- **Web Interface**: Modern, responsive UI built with Next.js
- **Image Upload**: Support for JPG, JPEG, and PNG files (up to 10MB)
- **Real-time Processing**: Side-by-side comparison of original and enhanced images
- **LIME Algorithm**: Advanced low-light image enhancement using OpenCV and NumPy
- **Automatic Cleanup**: Temporary files are automatically cleaned up after processing

## Prerequisites

Before running this tool, make sure you have the following installed:

- **Node.js** (version 18 or higher)
- **Python** (version 3.7 or higher)
- **npm** or **yarn**

## Installation

### 1. Clone or Download the Project

```bash
# If you have the project files, navigate to the project directory
cd image-enhance
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

**Note**: If you're on Windows and encounter issues with OpenCV, you might need to install the pre-built wheels:

```bash
pip install opencv-python-headless
```

### 4. Create Required Directories

The application will automatically create the `uploads` directory when needed, but you can create it manually:

```bash
mkdir uploads
```

## Usage

### 1. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 2. Using the Web Interface

1. **Upload Image**: Click the file input to select a low-light image (JPG, JPEG, or PNG)
2. **Enhance Image**: Click the "Enhance Image" button to process the image
3. **View Results**: The original and enhanced images will be displayed side by side
4. **Reset**: Use the "Reset" button to clear the current images and start over

### 3. Command Line Usage (Optional)

You can also use the Python script directly from the command line:

```bash
python backend/lime_enhance.py input_image.jpg output_enhanced.jpg
```

Additional parameters:
- `--alpha`: Alpha parameter for illumination estimation (default: 0.15)
- `--beta`: Beta parameter for illumination estimation (default: 0.08)
- `--gamma`: Gamma correction parameter (default: 0.8)

Example:
```bash
python backend/lime_enhance.py dark_image.jpg enhanced_image.jpg --alpha 0.2 --gamma 0.7
```

## Project Structure

```
image-enhance/
├── pages/
│   ├── index.js              # Main frontend page
│   └── api/
│       └── enhance.js        # API route for image processing
├── backend/
│   └── lime_enhance.py      # LIME enhancement algorithm
├── uploads/                  # Temporary upload directory (auto-created)
├── package.json              # Node.js dependencies
├── requirements.txt          # Python dependencies
├── next.config.js           # Next.js configuration
└── README.md               # This file
```

## Technical Details

### Frontend (Next.js)
- **Framework**: Next.js 14 with Pages Router
- **Styling**: Tailwind CSS classes for responsive design
- **File Upload**: FormData with fetch API
- **Image Preview**: Client-side image preview with blob URLs

### Backend (Python)
- **Algorithm**: LIME (Low-Light Image Enhancement)
- **Libraries**: OpenCV, NumPy, PIL
- **Features**: 
  - Guided filter for illumination estimation
  - Gamma correction
  - Configurable parameters (alpha, beta, gamma)

### API (Node.js)
- **File Handling**: Multer for multipart form data
- **Process Management**: Child process execution of Python script
- **Error Handling**: Comprehensive error handling and logging
- **Cleanup**: Automatic cleanup of temporary files

## Algorithm Parameters

The LIME algorithm uses several parameters that can be adjusted:

- **Alpha (α)**: Controls the illumination estimation (default: 0.15)
  - Higher values: More aggressive enhancement
  - Lower values: More conservative enhancement

- **Beta (β)**: Minimum illumination value (default: 0.08)
  - Prevents division by zero
  - Controls the minimum brightness level

- **Gamma (γ)**: Gamma correction parameter (default: 0.8)
  - Higher values: Brighter output
  - Lower values: Darker output

## Troubleshooting

### Common Issues

1. **Python not found**: Make sure Python is installed and in your PATH
2. **OpenCV installation issues**: Try installing `opencv-python-headless` instead
3. **Permission errors**: Ensure the application has write permissions to the uploads directory
4. **Memory issues**: Large images may require more memory; try smaller images

### Error Messages

- **"Failed to enhance image"**: Check if Python and required libraries are installed
- **"Invalid file type"**: Ensure you're uploading JPG, JPEG, or PNG files
- **"File size too large"**: Images must be under 10MB

### Debug Mode

To see detailed logs, check the terminal where you ran `npm run dev`. The application logs:
- File upload events
- Python script execution
- Error messages
- Cleanup operations

## Development

### Adding New Features

1. **Frontend**: Modify `pages/index.js` for UI changes
2. **API**: Modify `pages/api/enhance.js` for backend logic
3. **Algorithm**: Modify `backend/lime_enhance.py` for image processing

### Testing

1. **Manual Testing**: Upload various image types and sizes
2. **Algorithm Testing**: Use the command-line interface for batch processing
3. **Error Testing**: Try invalid files and edge cases

## License

This project is created for research purposes. The LIME algorithm implementation is based on academic research in low-light image enhancement.

## Contributing

For research purposes, feel free to modify the algorithm parameters or add new features. The modular design makes it easy to extend the functionality.

## Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify all dependencies are installed correctly
3. Ensure Python and Node.js are properly configured
4. Try with a smaller test image first 