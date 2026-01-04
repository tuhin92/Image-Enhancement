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
      // Use virtual environment Python if available (Railway), otherwise system Python
      const pythonCmd = fs.existsSync('/opt/venv/bin/python3') 
        ? '/opt/venv/bin/python3' 
        : 'python';
      
      console.log('Using Python command:', pythonCmd);
      console.log('Python script exists:', fs.existsSync(pythonScriptPath));
      console.log('Input file exists:', fs.existsSync(inputPath));
      
      const { stdout, stderr } = await execFileAsync(
        pythonCmd,
        ['-u', pythonScriptPath, inputPath, outputPath],
        {
          timeout: 180000, // 3 minute timeout (Railway can be slower than local)
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            // Reduce CPU/memory pressure on small containers (common cause of SIGKILL/OOM)
            OMP_NUM_THREADS: process.env.OMP_NUM_THREADS || '1',
            OPENBLAS_NUM_THREADS: process.env.OPENBLAS_NUM_THREADS || '1',
            MKL_NUM_THREADS: process.env.MKL_NUM_THREADS || '1',
            NUMEXPR_NUM_THREADS: process.env.NUMEXPR_NUM_THREADS || '1',
            VECLIB_MAXIMUM_THREADS: process.env.VECLIB_MAXIMUM_THREADS || '1',
            // Controls downscaling in backend/hybrid.py; lower = less RAM, higher = better quality.
            // If Railway runs out of memory, set MAX_IMAGE_DIM back to 900 (or lower) in Railway Variables.
            MAX_IMAGE_DIM: process.env.MAX_IMAGE_DIM || '1600',
          },
        }
      );

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

      // Read enhanced image buffer
      const enhancedImageBuffer = fs.readFileSync(outputPath);
      console.log('Enhanced image buffer size:', enhancedImageBuffer.length);

      // Compute metrics by calling backend/metrics.py (keeps hybrid.py unchanged)
      let metrics = null;
      try {
        const metricsScriptPath = path.join(process.cwd(), 'backend', 'metrics.py');
        console.log('Metrics script path:', metricsScriptPath);
        console.log('Current working directory:', process.cwd());
        
        if (!fs.existsSync(metricsScriptPath)) {
          console.error('Metrics script not found at:', metricsScriptPath);
          throw new Error('Metrics script not found');
        }

        console.log('Calling metrics script...');
        console.log('Input path for metrics:', inputPath);
        console.log('Output path for metrics:', outputPath);
        console.log('Input file exists:', fs.existsSync(inputPath));
        console.log('Output file exists:', fs.existsSync(outputPath));
        console.log('Using Python command:', pythonCmd);
        
        const { stdout: metricsOut, stderr: metricsErr } = await execFileAsync(
          pythonCmd,
          ['-u', metricsScriptPath, inputPath, outputPath],
          { 
            timeout: 30000, 
            maxBuffer: 5 * 1024 * 1024,
            cwd: process.cwd(), // Explicitly set working directory
            env: {
              ...process.env,
              PYTHONUNBUFFERED: '1',
              PYTHONIOENCODING: 'utf-8',
              OMP_NUM_THREADS: process.env.OMP_NUM_THREADS || '1',
              OPENBLAS_NUM_THREADS: process.env.OPENBLAS_NUM_THREADS || '1',
              MKL_NUM_THREADS: process.env.MKL_NUM_THREADS || '1',
              NUMEXPR_NUM_THREADS: process.env.NUMEXPR_NUM_THREADS || '1',
              VECLIB_MAXIMUM_THREADS: process.env.VECLIB_MAXIMUM_THREADS || '1',
            }
          }
        );

        console.log('Metrics stdout length:', metricsOut ? metricsOut.length : 0);
        console.log('Metrics stdout:', metricsOut);
        if (metricsErr) {
          console.warn('Metrics stderr (warnings may be present):', metricsErr);
        }

        if (!metricsOut || !metricsOut.trim()) {
          throw new Error('Metrics script returned empty output');
        }

        try {
          // Trim whitespace and try to extract JSON (in case there are warnings)
          const trimmedOutput = metricsOut.trim();
          
          // Try to find JSON object in output (in case of warnings before JSON)
          let jsonStr = trimmedOutput;
          const jsonMatch = trimmedOutput.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonStr = jsonMatch[0];
          }
          
          metrics = JSON.parse(jsonStr);
          console.log('Metrics parsed successfully:', JSON.stringify(metrics));
          
          // Validate metrics structure - check if it's an error object
          if (metrics && metrics.error) {
            console.error('Metrics script returned error:', metrics.error);
            throw new Error(`Metrics script returned error: ${metrics.error}`);
          }
          
          // Validate required fields exist and are valid numbers
          if (!metrics || typeof metrics.mse !== 'number' || typeof metrics.psnr !== 'number' || typeof metrics.ssim !== 'number') {
            console.error('Metrics structure incomplete - missing required fields:', metrics);
            console.error('Metrics type:', typeof metrics);
            console.error('MSE type:', typeof metrics?.mse);
            console.error('PSNR type:', typeof metrics?.psnr);
            console.error('SSIM type:', typeof metrics?.ssim);
            throw new Error('Metrics structure incomplete - missing required fields');
          }
          
          // Ensure all values are finite numbers
          if (!isFinite(metrics.mse) || !isFinite(metrics.psnr) || !isFinite(metrics.ssim)) {
            console.warn('Metrics contain non-finite values, attempting to fix...');
            metrics.mse = isFinite(metrics.mse) ? metrics.mse : 0;
            metrics.psnr = isFinite(metrics.psnr) ? metrics.psnr : 0;
            metrics.ssim = isFinite(metrics.ssim) ? metrics.ssim : 0;
          }
          
          console.log('Metrics validation passed:', {
            mse: metrics.mse,
            psnr: metrics.psnr,
            ssim: metrics.ssim
          });
          
        } catch (parseErr) {
          console.error('Failed to parse metrics JSON:', parseErr);
          console.error('Parse error message:', parseErr.message);
          console.error('Raw stdout was:', metricsOut);
          console.error('Trimmed stdout was:', metricsOut.trim());
          console.error('Stderr was:', metricsErr);
          throw parseErr;
        }

      } catch (metricsError) {
        console.error('Metrics calculation failed:', metricsError);
        console.error('Metrics error details:', metricsError.message);
        console.error('Metrics error code:', metricsError.code);
        console.error('Metrics error signal:', metricsError.signal);
        if (metricsError.stdout) {
          console.error('Metrics error stdout:', metricsError.stdout);
        }
        if (metricsError.stderr) {
          console.error('Metrics error stderr:', metricsError.stderr);
        }
        // Continue without metrics (will be null) - don't fail the entire request
        console.warn('Continuing without metrics due to calculation failure');
      }

      // Prepare JSON response with base64 image and metrics
      const responseJson = {
        image: enhancedImageBuffer.toString('base64'),
        mime: 'image/jpeg',
        metrics: metrics,
      };
      
      // Log metrics status for debugging
      console.log('Final response metrics status:', metrics ? 'present' : 'null');
      if (metrics) {
        console.log('Final metrics values:', {
          mse: metrics.mse,
          psnr: metrics.psnr,
          ssim: metrics.ssim
        });
      }

      // Clean up temporary files (optional)
      try {
        // fs.unlinkSync(inputPath);
        // fs.unlinkSync(outputPath);
        console.log('Temporary files cleaned up');
      } catch (cleanupError) {
        console.error('Error cleaning up files:', cleanupError);
      }

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(responseJson);

    } catch (pythonError) {
      console.error('Python script error:', pythonError);
      console.error('Python error message:', pythonError.message);
      console.error('Python error code:', pythonError.code);
      console.error('Python stdout:', pythonError.stdout);
      console.error('Python stderr:', pythonError.stderr);
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
        error: 'Failed to enhance image',
        details: pythonError.message,
        code: pythonError.code ?? null,
        signal: pythonError.signal ?? null,
        killed: pythonError.killed ?? null,
        stderr: pythonError.stderr || 'No stderr output',
        stdout: pythonError.stdout || 'No stdout output'
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