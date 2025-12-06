import multer from 'multer';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);

// Configure multer for file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, JPEG, and PNG files are allowed.'));
    }
  }
});

// Disable body parsing, we'll handle it with multer
export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadMiddleware = upload.single('image');

export default async function handler(req, res) {
  console.log('API route called with method:', req.method);
  
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting file upload handling...');
    
    // Handle file upload
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) {
          console.error('Multer error:', err);
          reject(err);
        } else {
          console.log('File upload successful');
          resolve();
        }
      });
    });

    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    console.log('File uploaded successfully:', req.file.filename);
    console.log('File path:', req.file.path);
    console.log('File size:', req.file.size);

    const inputPath = req.file.path;
    const outputPath = path.join(
      path.dirname(inputPath),
      'enhanced-' + path.basename(inputPath)
    );

    console.log('Input path:', inputPath);
    console.log('Output path:', outputPath);

    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.error('Input file does not exist:', inputPath);
      return res.status(500).json({ error: 'Uploaded file not found' });
    }

    // Call Python script
    console.log('Calling Python script...');
    const pythonScriptPath = path.join(process.cwd(), 'backend', 'hybrid.py');
    console.log('Python script path:', pythonScriptPath);
    
    if (!fs.existsSync(pythonScriptPath)) {
      console.error('Python script not found:', pythonScriptPath);
      return res.status(500).json({ error: 'Python script not found' });
    }

    try {
      const { stdout, stderr } = await execFileAsync('python', [
        pythonScriptPath,
        inputPath,
        outputPath
      ]);

      console.log('Python stdout:', stdout);
      if (stderr) {
        console.error('Python stderr:', stderr);
      }

      // Check if enhanced image was created
      if (!fs.existsSync(outputPath)) {
        console.error('Enhanced image was not created:', outputPath);
        throw new Error('Enhanced image was not created');
      }

      console.log('Enhanced image created successfully:', outputPath);

      // Read and return the enhanced image
      const enhancedImageBuffer = fs.readFileSync(outputPath);
      console.log('Enhanced image buffer size:', enhancedImageBuffer.length);
      
      // Clean up temporary files
      try {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
        console.log('Temporary files cleaned up');
      } catch (cleanupError) {
        console.error('Error cleaning up files:', cleanupError);
      }

      // Set response headers
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', 'inline; filename="enhanced-image.jpg"');
      
      console.log('Sending enhanced image to client');
      res.status(200).send(enhancedImageBuffer);

    } catch (pythonError) {
      console.error('Python script error:', pythonError);
      console.error('Python error details:', pythonError.message);
      console.error('Python error stack:', pythonError.stack);
      
      // Clean up input file on error
      try {
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
          console.log('Cleaned up input file on error');
        }
      } catch (cleanupError) {
        console.error('Error cleaning up input file:', cleanupError);
      }

      return res.status(500).json({ 
        error: 'Failed to enhance image. Please check if Python and required libraries are installed.',
        details: pythonError.message 
      });
    }

  } catch (error) {
    console.error('API error:', error);
    console.error('API error details:', error.message);
    console.error('API error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Failed to process image',
      details: error.message 
    });
  }
} 