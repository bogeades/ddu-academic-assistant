const path = require('path');
const fs = require('fs');
const { CourseMaterial, Course, SystemSetting, Summary, User } = require('../models');
const LecturerAssignment = require('../models/LecturerAssignment');
const aiGateway = require('../services/aiGateway');
const { extractText } = require('../services/fileText');

/**
 * @desc    FR-S05: Get course materials with search (q), course & subject filters, and pagination
 * @route   GET /api/materials
 * @access  Private (All authenticated roles)
 */
const getMaterials = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const query = {};

    // Students strictly see only approved materials matching their department, year, semester, section
    if (req.user.role === 'student') {
      query.approvalStatus = 'approved';
      const student = await User.findById(req.user._id);
      if (student) {
        query.$and = query.$and || [];
        if (student.department) {
          query.$and.push({
            $or: [
              { department: student.department },
              { department: { $exists: false } },
              { department: null },
            ],
          });
        }
        if (student.yearOfStudy) {
          query.$and.push({
            $or: [
              { academicYear: student.yearOfStudy },
              { academicYear: { $exists: false } },
              { academicYear: null },
            ],
          });
        }
        if (student.semester) {
          query.$and.push({
            $or: [
              { semester: student.semester },
              { semester: { $exists: false } },
              { semester: null },
            ],
          });
        }
        if (student.section) {
          query.$and.push({
            $or: [
              { section: student.section },
              { section: 'ALL' },
              { section: { $exists: false } },
              { section: null },
            ],
          });
        }
      }
    } else if (req.query.approvalStatus) {
      query.approvalStatus = req.query.approvalStatus;
    }

    // Filter by course code
    if (req.query.courseCode) {
      query.courseCode = req.query.courseCode.toUpperCase().trim();
    }

    // Filter by subject
    if (req.query.subject) {
      query.subject = new RegExp(req.query.subject.trim(), 'i');
    }

    // Search query 'q' or 'search' (by title, subject, or topic) - responds < 2s
    const searchTerm = (req.query.q || req.query.search || '').trim();
    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm, 'i');
      const searchCondition = {
        $or: [
          { title: searchRegex },
          { subject: searchRegex },
          { courseCode: searchRegex },
          { description: searchRegex },
        ],
      };
      if (query.$and) {
        query.$and.push(searchCondition);
      } else {
        query.$or = searchCondition.$or;
      }
    }

    const [materials, total] = await Promise.all([
      CourseMaterial.find(query)
        .populate('uploadedBy', 'name email role department lecturerId')
        .populate('course', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseMaterial.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: materials.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
      data: materials,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single material by ID
 * @route   GET /api/materials/:id
 * @access  Private
 */
const getMaterialById = async (req, res, next) => {
  try {
    const material = await CourseMaterial.findById(req.params.id)
      .populate('uploadedBy', 'name email role lecturerId')
      .populate('course', 'name code');

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    if (req.user.role === 'student') {
      if (material.approvalStatus !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'This learning material is not yet approved for student access.',
        });
      }

      const student = await User.findById(req.user._id);
      if (student) {
        if (material.department && student.department && material.department.toString() !== student.department.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access forbidden: You cannot access learning materials belonging to another department.',
          });
        }
        if (material.academicYear && student.yearOfStudy && material.academicYear !== student.yearOfStudy) {
          return res.status(403).json({
            success: false,
            message: `Access forbidden: Year ${student.yearOfStudy} students cannot access Year ${material.academicYear} course materials.`,
          });
        }
        if (material.semester && student.semester && material.semester !== student.semester) {
          return res.status(403).json({
            success: false,
            message: `Access forbidden: Semester ${student.semester} students cannot access Semester ${material.semester} course materials.`,
          });
        }
        if (material.section && material.section !== 'ALL' && student.section && material.section !== student.section) {
          return res.status(403).json({
            success: false,
            message: `Access forbidden: This learning material is restricted to Section ${material.section}.`,
          });
        }
      }
    }

    res.status(200).json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L02, FR-A06: Upload course learning material (PDF/DOC/DOCX/PPT/PPTX/TXT/MD/PNG/JPG or typed text)
 * @route   POST /api/materials
 * @access  Private (Lecturer, Admin)
 */
const uploadMaterial = async (req, res, next) => {
  try {
    const {
      title,
      subject,
      courseCode,
      courseId,
      description,
      materialType = 'pdf',
      textContent,
      courseDescriptionOverride,
      department,
      academicYear,
      semester,
      section = 'ALL',
    } = req.body;

    const isText = materialType === 'text' || (!req.file && textContent);

    if (!isText && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a document file to upload, or choose "Enter Text / Lecture Notes" to type notes directly.',
      });
    }

    if (!title || !courseCode) {
      return res.status(400).json({
        success: false,
        message: 'Title and course code are required fields.',
      });
    }

    if (isText && (!textContent || !textContent.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter the lecture content or paste text notes.',
      });
    }

    // Lookup course if available
    const course = courseId
      ? await Course.findById(courseId)
      : await Course.findOne({ code: courseCode.toUpperCase().trim() });

    // Validate lecturer assignment if lecturer role
    if (req.user.role === 'lecturer') {
      const assignmentQuery = {
        lecturer: req.user._id,
        status: 'approved',
      };
      if (course) {
        assignmentQuery.course = course._id;
      }
      const hasAssignment = await LecturerAssignment.findOne(assignmentQuery);
      if (!hasAssignment) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You can only upload materials for courses officially assigned to you and approved by the administrator.',
        });
      }

      // If lecturer provided courseDescriptionOverride, update LecturerAssignment
      if (courseDescriptionOverride && courseDescriptionOverride.trim()) {
        await LecturerAssignment.updateMany(
          { lecturer: req.user._id, course: course?._id },
          { courseDescription: courseDescriptionOverride.trim() }
        );
      }
    }

    // Check system setting for material approval (FR-DH05)
    const settings = await SystemSetting.getSettings();
    let approvalStatus = 'approved';
    if (settings && settings.materialApprovalRequired && req.user.role !== 'admin') {
      approvalStatus = 'pending';
    }

    // Resolve department, academicYear, semester
    const resolvedDept = department || (course ? course.department : req.user.department);
    const resolvedYear = academicYear ? parseInt(academicYear, 10) : (course ? (course.academicYear || course.yearLevel || 1) : 1);
    const resolvedSem = semester ? parseInt(semester, 10) : (course ? course.semester : 1);

    let filePath = '';
    let fileName = '';
    let fileUrl = '';
    let mimeType = 'text/plain';
    let size = 0;

    if (isText) {
      fileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_notes.txt`;
      const uploadsDir = path.resolve(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      filePath = path.join(uploadsDir, `${Date.now()}_${fileName}`);
      fs.writeFileSync(filePath, textContent, 'utf8');
      fileUrl = `/api/materials/${path.basename(filePath)}/download`;
      mimeType = 'text/plain';
      size = Buffer.byteLength(textContent, 'utf8');
    } else {
      filePath = req.file.path;
      fileName = req.file.originalname;
      fileUrl = `/api/materials/${req.file.filename}/download`;
      mimeType = req.file.mimetype;
      size = req.file.size;
    }

    const material = await CourseMaterial.create({
      title: title.trim(),
      subject: (subject || course?.name || courseCode).trim(),
      courseCode: courseCode.toUpperCase().trim(),
      course: course ? course._id : undefined,
      department: resolvedDept,
      academicYear: resolvedYear,
      semester: resolvedSem,
      section: section || 'ALL',
      description: description ? description.trim() : '',
      materialType: isText ? 'text' : 'pdf',
      textContent: isText ? textContent : undefined,
      courseDescriptionOverride: courseDescriptionOverride?.trim() || undefined,
      fileName,
      filePath,
      fileUrl,
      mimeType,
      size,
      uploadedBy: req.user._id,
      approvalStatus,
    });

    res.status(201).json({
      success: true,
      message:
        approvalStatus === 'pending'
          ? 'Material uploaded successfully! It is pending review by the Department Head.'
          : 'Material uploaded and published successfully.',
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-S05: Download material file with authenticated access verification
 * @route   GET /api/materials/:id/download
 * @access  Private
 */
const downloadMaterial = async (req, res, next) => {
  try {
    const material = await CourseMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    if (req.user.role === 'student') {
      if (material.approvalStatus !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'This material is not approved for student download.',
        });
      }

      const student = await User.findById(req.user._id);
      if (student) {
        if (material.department && student.department && material.department.toString() !== student.department.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access forbidden: You cannot download materials from another department.',
          });
        }
        if (material.academicYear && student.yearOfStudy && material.academicYear !== student.yearOfStudy) {
          return res.status(403).json({
            success: false,
            message: `Access forbidden: Year ${student.yearOfStudy} students cannot download Year ${material.academicYear} materials.`,
          });
        }
        if (material.semester && student.semester && material.semester !== student.semester) {
          return res.status(403).json({
            success: false,
            message: `Access forbidden: Semester ${student.semester} students cannot download Semester ${material.semester} materials.`,
          });
        }
        if (material.section && material.section !== 'ALL' && student.section && material.section !== student.section) {
          return res.status(403).json({
            success: false,
            message: `Access forbidden: This material is restricted to Section ${material.section}.`,
          });
        }
      }
    }

    // If it's a typed text material and filePath doesn't exist, we can serve textContent directly
    if (material.materialType === 'text' && material.textContent && (!material.filePath || !fs.existsSync(material.filePath))) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${material.fileName || 'lecture_notes.txt'}"`);
      return res.send(material.textContent);
    }

    // Resolve file path
    let filePath = material.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      if (material.fileUrl) {
        const filename = path.basename(material.fileUrl);
        const altPath = path.resolve(__dirname, '../uploads', filename);
        if (fs.existsSync(altPath)) {
          filePath = altPath;
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      if (material.textContent) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${material.fileName || 'lecture_notes.txt'}"`);
        return res.send(material.textContent);
      }
      return res.status(404).json({
        success: false,
        message: 'File physical storage not found on server.',
      });
    }

    // Increment download counter
    material.downloadCount = (material.downloadCount || 0) + 1;
    await material.save();

    res.download(filePath, material.fileName || material.originalFilename || 'Material-Download');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    In-browser stream / view of material (PDF or text) with access verification
 * @route   GET /api/materials/:id/view
 * @access  Private
 */
const viewMaterial = async (req, res, next) => {
  try {
    const material = await CourseMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    if (req.user.role === 'student') {
      if (material.approvalStatus !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'This material is not approved for student access.',
        });
      }

      const student = await User.findById(req.user._id);
      if (student) {
        if (material.department && student.department && material.department.toString() !== student.department.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access forbidden: You cannot view materials from another department.',
          });
        }
        if (material.academicYear && student.yearOfStudy && material.academicYear !== student.yearOfStudy) {
          return res.status(403).json({
            success: false,
            message: `Access forbidden: Year ${student.yearOfStudy} students cannot access Year ${material.academicYear} materials.`,
          });
        }
        if (material.semester && student.semester && material.semester !== student.semester) {
          return res.status(403).json({
            success: false,
            message: `Access forbidden: Semester ${student.semester} students cannot access Semester ${material.semester} materials.`,
          });
        }
        if (material.section && material.section !== 'ALL' && student.section && material.section !== student.section) {
          return res.status(403).json({
            success: false,
            message: `Access forbidden: This material is restricted to Section ${material.section}.`,
          });
        }
      }
    }

    // If it's a typed text material
    if (material.materialType === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="${material.fileName || 'lecture_notes.txt'}"`);
      return res.send(material.textContent || '');
    }

    // Resolve file path
    let filePath = material.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      if (material.fileUrl) {
        const filename = path.basename(material.fileUrl);
        const altPath = path.resolve(__dirname, '../uploads', filename);
        if (fs.existsSync(altPath)) {
          filePath = altPath;
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      if (material.textContent) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${material.fileName || 'lecture_notes.txt'}"`);
        return res.send(material.textContent);
      }
      return res.status(404).json({
        success: false,
        message: 'File physical storage not found on server.',
      });
    }

    res.setHeader('Content-Type', material.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${material.fileName || 'document.pdf'}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L02: Edit metadata for uploaded course material
 * @route   PUT /api/materials/:id
 * @access  Private (Owner Lecturer or Admin)
 */
const updateMaterial = async (req, res, next) => {
  try {
    const material = await CourseMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    // Check ownership or admin
    if (material.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to edit materials you uploaded.',
      });
    }

    const { title, subject, courseCode, description } = req.body;

    if (title) material.title = title.trim();
    if (subject) material.subject = subject.trim();
    if (courseCode) material.courseCode = courseCode.toUpperCase().trim();
    if (description !== undefined) material.description = description.trim();

    await material.save();

    res.status(200).json({
      success: true,
      message: 'Course material metadata updated successfully.',
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L02, FR-A06: Delete course material record and file on disk
 * @route   DELETE /api/materials/:id
 * @access  Private (Owner Lecturer or Admin)
 */
const deleteMaterial = async (req, res, next) => {
  try {
    const material = await CourseMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    // Check ownership or admin
    if (material.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to delete materials you uploaded.',
      });
    }

    // Remove file from disk
    const filePath = material.filePath || path.resolve(__dirname, '../uploads', path.basename(material.fileUrl || ''));
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('[File Deletion Warning]:', err.message);
      }
    }

    await material.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Course material and file deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L07: Summarize an existing stored material using the AI Gateway
 * @route   POST /api/materials/:id/summarize
 * @access  Private (Lecturer, Student)
 */
const summarizeStoredMaterial = async (req, res, next) => {
  try {
    const material = await CourseMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    if (req.user.role === 'student' && material.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'This material is not yet approved for student study.',
      });
    }

    // Resolve file path
    let filePath = material.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      const filename = path.basename(material.fileUrl || '');
      filePath = path.resolve(__dirname, '../uploads', filename);
    }

    let extractedText = '';
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const fileBuffer = fs.readFileSync(filePath);
      const fakeMulterFile = {
        buffer: fileBuffer,
        originalname: material.fileName || material.originalFilename || 'material.txt',
        mimetype: material.mimeType || 'text/plain',
        size: fileBuffer.length,
      };

      try {
        extractedText = await extractText(fakeMulterFile);
      } catch (e) {
        // Fallback to text reading or description
        extractedText = fileBuffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
        if (extractedText.length < 20) {
          extractedText = `${material.title}. Subject: ${material.subject}. Course: ${material.courseCode}. Description: ${material.description || ''}`;
        }
      }
    } else {
      extractedText = `${material.title}. Subject: ${material.subject}. Course: ${material.courseCode}. Description: ${material.description || ''}`;
    }

    // Call AI Gateway to generate structured academic summary
    const summaryResult = await aiGateway.summarize(extractedText);

    // Save summary in database (FR-S04, FR-L07)
    const summary = await Summary.create({
      user: req.user._id,
      title: `${material.title} (Summary)`,
      sourceName: material.fileName || material.title,
      sourceLength: extractedText.length,
      summaryText: summaryResult.summaryText,
      keyPoints: summaryResult.keyPoints || [],
    });

    res.status(201).json({
      success: true,
      message: 'Material summarized successfully via AI Gateway.',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMaterials,
  getMaterialById,
  uploadMaterial,
  downloadMaterial,
  viewMaterial,
  updateMaterial,
  deleteMaterial,
  summarizeStoredMaterial,
  // Alias for compatibility
  generateMaterialSummary: summarizeStoredMaterial,
};
