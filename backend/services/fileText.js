const path = require('path');
const multer = require('multer');
const mammoth = require('mammoth');

/**
 * Configure Multer for in-memory document uploads (max 10 MB)
 */
const storage = multer.memoryStorage();

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/octet-stream', // sometimes sent for .md or .txt
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type '${ext}'. Allowed formats are PDF, DOCX, TXT, and Markdown (.md).`
      ),
      false
    );
  }
};

const uploadDocument = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter,
});

/**
 * Extracts plain text from an uploaded Multer file in memory buffer
 * @param {Object} file - Multer file object with buffer, mimetype, originalname
 * @returns {Promise<string>} Extracted text content
 */
async function extractText(file) {
  if (!file || !file.buffer) {
    throw new Error('No valid file uploaded for text extraction.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size exceeds the 10 MB limit.');
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimetype = (file.mimetype || '').toLowerCase();
  let extractedText = '';

  try {
    if (ext === '.pdf' || mimetype === 'application/pdf') {
      const pdfModule = require('pdf-parse');
      if (pdfModule.PDFParse) {
        // pdf-parse v2+ class interface
        const parser = new pdfModule.PDFParse({ data: file.buffer });
        const result = await parser.getText();
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
        extractedText = typeof result === 'string' ? result : (result && result.text) || '';
      } else if (typeof pdfModule === 'function') {
        // pdf-parse v1 function interface
        const result = await pdfModule(file.buffer);
        extractedText = (result && result.text) || '';
      } else {
        throw new Error('PDF extraction engine is not available.');
      }
    } else if (
      ext === '.docx' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      extractedText = (result && result.value) || '';
    } else if (
      ext === '.txt' ||
      ext === '.md' ||
      mimetype.startsWith('text/') ||
      mimetype === 'application/octet-stream'
    ) {
      extractedText = file.buffer.toString('utf8');
    } else {
      throw new Error(
        `Unsupported document type '${ext || mimetype}'. Please upload a PDF, DOCX, TXT, or MD file.`
      );
    }
  } catch (err) {
    if (err.message && err.message.includes('Unsupported document type')) {
      throw err;
    }
    throw new Error(`Failed to extract text from file (${file.originalname}): ${err.message}`);
  }

  // Clean and validate extracted text
  const cleaned = extractedText.replace(/\r\n/g, '\n').trim();
  if (cleaned.length < 10) {
    throw new Error(
      `File '${file.originalname}' contains no readable text or is corrupted/empty.`
    );
  }

  return cleaned;
}

module.exports = {
  uploadDocument,
  extractText,
};
