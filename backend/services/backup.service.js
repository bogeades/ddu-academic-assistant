const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { Backup } = require('../models');

const backupDirectory = path.resolve(__dirname, '../backups');
if (!fs.existsSync(backupDirectory)) {
  fs.mkdirSync(backupDirectory, { recursive: true });
}

/**
 * Execute database backup (manual or automated via cron) - FR-A05
 * @param {string} type - 'manual' | 'auto'
 * @param {string} initiatedBy - User ObjectId (null for automated)
 */
const runBackupJob = async (type = 'manual', initiatedBy = null) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `ddu_backup_${type}_${timestamp}.json`;
  const filePath = path.join(backupDirectory, filename);

  const backupRecord = await Backup.create({
    filename,
    filePath,
    type,
    status: 'pending',
    initiatedBy: initiatedBy || undefined,
  });

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ddu_academic_assistant';

    // Export core metadata snapshot to file
    const models = require('../models');
    const snapshot = {};

    for (const [modelName, Model] of Object.entries(models)) {
      try {
        snapshot[modelName] = await Model.find({}).lean();
      } catch (e) {
        snapshot[modelName] = [];
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
    const stats = fs.statSync(filePath);

    backupRecord.status = 'completed';
    backupRecord.sizeBytes = stats.size;
    await backupRecord.save();

    console.log(`[Backup Success]: Saved ${type} snapshot (${stats.size} bytes) to ${filename}`);
    return backupRecord;
  } catch (error) {
    console.error(`[Backup Error]: ${error.message}`);
    backupRecord.status = 'failed';
    backupRecord.errorLog = error.message;
    await backupRecord.save();
    throw error;
  }
};

/**
 * Restore database from an existing backup snapshot - FR-A05
 */
const restoreBackup = async (backupId) => {
  const backup = await Backup.findById(backupId);
  if (!backup) {
    throw new Error('Specified backup record does not exist.');
  }

  if (!fs.existsSync(backup.filePath)) {
    throw new Error('Backup physical file was not found on server storage.');
  }

  const rawData = fs.readFileSync(backup.filePath, 'utf8');
  const snapshot = JSON.parse(rawData);
  const models = require('../models');

  let restoredCollections = 0;
  for (const [modelName, docs] of Object.entries(snapshot)) {
    if (models[modelName] && Array.isArray(docs) && docs.length > 0) {
      // Clear and re-populate
      await models[modelName].deleteMany({});
      await models[modelName].insertMany(docs);
      restoredCollections++;
    }
  }

  return {
    success: true,
    filename: backup.filename,
    restoredCollections,
    message: `Database successfully restored from snapshot ${backup.filename}.`,
  };
};

module.exports = {
  runBackupJob,
  restoreBackup,
};
