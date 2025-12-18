import { Request, Response } from 'express';
import { progressTrackingRepository } from '../repositories/progress-tracking.repository';

export const createMonitoringRecord = async (req: Request, res: Response) => {
  try {
    // Simple validation
    const { resourceId, monitoringDate, heightCm, trunkDiameterCm, healthStatus, watered, fertilized, pruned, pestIssues, diseaseIssues, generalNotes, weatherConditions } = req.body;

    if (!resourceId || !monitoringDate || !healthStatus) {
      res.status(400).json({
        success: false,
        message: 'resource ID, monitoring date, and health status are required'
      });
      return;
    }

    const studentId = req.user?.id;
    if (!studentId) {
      res.status(401).json({
        success: false,
        message: 'Student authentication required'
      });
      return;
    }

    const recordData = {
      resourceId,
      studentId,
      monitoringDate: new Date(monitoringDate),
      heightCm,
      trunkDiameterCm,
      healthStatus,
      watered: watered || false,
      fertilized: fertilized || false,
      pruned: pruned || false,
      pestIssues,
      diseaseIssues,
      generalNotes,
      weatherConditions
    };

    const record = await progressTrackingRepository.createMonitoringRecord(recordData);

    res.status(201).json({
      success: true,
      message: 'Monitoring record created successfully',
      data: record
    });
  } catch (error) {
    console.error('Error creating monitoring record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create monitoring record'
    });
  }
};

export const getMonitoringRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await progressTrackingRepository.getMonitoringRecordById(id);

    if (!record) {
      res.status(404).json({
        success: false,
        message: 'Monitoring record not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Monitoring record retrieved successfully',
      data: record
    });
  } catch (error) {
    console.error('Error getting monitoring record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve monitoring record'
    });
  }
};

export const getMonitoringRecordsByresource = async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;

    const records = await progressTrackingRepository.getMonitoringRecordsByresource(resourceId);

    res.status(200).json({
      success: true,
      message: 'resource monitoring records retrieved successfully',
      data: records
    });
  } catch (error) {
    console.error('Error getting resource monitoring records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resource monitoring records'
    });
  }
};

export const getMyMonitoringRecords = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: 'Student authentication required'
      });
      return;
    }

    const records = await progressTrackingRepository.getMonitoringRecordsByStudent(studentId);

    res.status(200).json({
      success: true,
      message: 'Your monitoring records retrieved successfully',
      data: records
    });
  } catch (error) {
    console.error('Error getting student monitoring records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve your monitoring records'
    });
  }
};

export const getMonitoringRecords = async (req: Request, res: Response) => {
  try {
    // Simple query parsing
    const { startDate, endDate, collegeId, departmentId, studentId, resourceId } = req.query;

    // Set default date range if not provided (last 30 days)
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const filters = {
      collegeId: collegeId as string,
      departmentId: departmentId as string,
      studentId: studentId as string,
      resourceId: resourceId as string
    };

    const records = await progressTrackingRepository.getMonitoringRecordsByDateRange(
      start,
      end,
      filters
    );

    res.status(200).json({
      success: true,
      message: 'Monitoring records retrieved successfully',
      data: records
    });
  } catch (error) {
    console.error('Error getting monitoring records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve monitoring records'
    });
  }
};

export const updateMonitoringRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if record exists and user has permission to update
    const existingRecord = await progressTrackingRepository.getMonitoringRecordById(id);

    if (!existingRecord) {
      res.status(404).json({
        success: false,
        message: 'Monitoring record not found'
      });
      return;
    }

    // Students can only update their own records, staff can update any
    if (req.user?.role === 'student' && existingRecord.studentId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own monitoring records'
      });
      return;
    }

    const updatedRecord = await progressTrackingRepository.updateMonitoringRecord(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Monitoring record updated successfully',
      data: updatedRecord
    });
  } catch (error) {
    console.error('Error updating monitoring record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update monitoring record'
    });
  }
};

export const deleteMonitoringRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if record exists and user has permission to delete
    const existingRecord = await progressTrackingRepository.getMonitoringRecordById(id);

    if (!existingRecord) {
      res.status(404).json({
        success: false,
        message: 'Monitoring record not found'
      });
      return;
    }

    // Only students can delete their own records, or staff/admin can delete any
    if (req.user?.role === 'student' && existingRecord.studentId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own monitoring records'
      });
      return;
    }

    const deleted = await progressTrackingRepository.deleteMonitoringRecord(id);

    if (!deleted) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete monitoring record'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Monitoring record deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Error deleting monitoring record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete monitoring record'
    });
  }
};

export const verifyMonitoringRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const verifiedBy = req.user?.id;

    if (!verifiedBy) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Only staff, HOD, principal, or admin can verify records
    if (!['staff', 'hod', 'principal', 'admin'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Only staff members can verify monitoring records'
      });
      return;
    }

    const verifiedRecord = await progressTrackingRepository.verifyMonitoringRecord(id, verifiedBy);

    if (!verifiedRecord) {
      res.status(404).json({
        success: false,
        message: 'Monitoring record not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Monitoring record verified successfully',
      data: verifiedRecord
    });
  } catch (error) {
    console.error('Error verifying monitoring record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify monitoring record'
    });
  }
};

export const getMonitoringStats = async (req: Request, res: Response) => {
  try {
    const { collegeId, departmentId, studentId, startDate, endDate } = req.query;

    const filters = {
      collegeId: collegeId as string,
      departmentId: departmentId as string,
      studentId: studentId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    };

    const stats = await progressTrackingRepository.getMonitoringStats(filters);

    res.status(200).json({
      success: true,
      message: 'Monitoring statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Error getting monitoring stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve monitoring statistics'
    });
  }
};

export const getRecentUploads = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const query = `
      SELECT
        tm.*,
        u.name as student_name,
        u.email as student_email,
        d.name as department_name,
        t.resource_code,
        t.category,
        t.location_description
      FROM resource_monitoring tm
      LEFT JOIN users u ON tm.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN resources t ON tm.resource_id = t.id
      WHERE tm.image_url IS NOT NULL
      ORDER BY tm.created_at DESC
      LIMIT $1
    `;

    const { pool } = require('../../../config/database');
    const result = await pool.query(query, [parseInt(limit as string)]);

    const uploads = result.rows.map((row: any) => ({
      id: row.id,
      studentName: row.student_name,
      studentEmail: row.student_email,
      department: { name: row.department_name },
      resource: {
        resourceCode: row.resource_code,
        category: row.category,
        locationDescription: row.location_description
      },
      imageUrl: row.image_url,
      description: row.description || 'Progress update',
      type: row.monitoring_type || 'progress',
      uploadDate: row.created_at,
      createdAt: row.created_at
    }));

    res.status(200).json({
      success: true,
      message: 'Recent uploads retrieved successfully',
      data: uploads
    });

  } catch (error: any) {
    console.error('Error fetching recent uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent uploads',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
