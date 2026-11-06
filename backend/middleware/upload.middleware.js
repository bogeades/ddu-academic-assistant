const multer = require('multer');
const path = require('path');
const fs = require('fs');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}

// Ensure secure upload directory exists
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration with sanitized, unique file names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

// Allowed file extensions and MIME types (PDF, DOC, DOCX, PPT, PPTX, TXT, MD, PNG, JPG)
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.png',
  '.jpg',
  '.jpeg',
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type '${ext}'. Allowed types: PDF, DOC, DOCX, PPT, PPTX, TXT, MD, PNG, JPG.`
      ),
      false
    );
  }
};

const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10);

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024, // 15 MB
  },
});

/**
 * Middleware to optionally compress uploaded images (PNG/JPG) using sharp
 */
const compressImageIfApplicable = async (req, res, next) => {
  if (!req.file || !sharp) return next();

  const ext = path.extname(req.file.filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png'].includes(ext)) {
    try {
      const filePath = req.file.path;
      const tempPath = `${filePath}.compressed`;

      if (ext === '.png') {
        await sharp(filePath)
          .resize({ width: 1920, withoutEnlargement: true })
          .png({ compressionLevel: 8, palette: true })
          .toFile(tempPath);
      } else {
        await sharp(filePath)
          .resize({ width: 1920, withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true })
          .toFile(tempPath);
      }

      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(filePath);
        fs.renameSync(tempPath, filePath);
        const stats = fs.statSync(filePath);
        req.file.size = stats.size;
      }
    } catch (err) {
      // Non-blocking: keep original uploaded image if compression fails
      console.warn('[Image Compression Warning]:', err.message);
    }
  }
  next();
};

module.exports = upload;
module.exports.compressImageIfApplicable = compressImageIfApplicable;
