import { resource, resourcestatus } from '../../../types';

export interface CreateresourceRequest {
  resourceCode: string;
  category: string;
  startedDate: Date;
  locationDescription?: string;
  latitude?: number;
  longitude?: number;
  assignedStudentId?: string;
  assignedDate?: Date;
  status?: resourcestatus;
  collegeId: string;
  departmentId?: string;
  notes?: string;
}

export interface UpdateresourceRequest {
  category?: string;
  locationDescription?: string;
  latitude?: number;
  longitude?: number;
  assignedStudentId?: string;
  assignedDate?: Date;
  status?: resourcestatus;
  departmentId?: string;
  notes?: string;
}

export interface resourceWithDetails extends resource {
  collegeName?: string;
  departmentName?: string;
  studentName?: string;
  studentEmail?: string;
  studentRollNumber?: string;
  daysSincestarted?: number;
  healthScore?: number;
  lastUpdated?: string;
  last_photo_upload?: Date;
  batch_year?: number;
}

export interface resourcestatistics {
  totalresources: number;
  resourcesByStatus: Record<resourcestatus, number>;
  assignedresources: number;
  unassignedresources: number;
  resourcesBycategory: Array<{ category: string; count: number }>;
  healthyresources: number;
  resourcesNeedingAttention: number;
}

export class resourceModel {
  /**
   * Validate create resource request
   */
  static validateCreateresourceRequest(data: any): data is CreateresourceRequest {
    return (
      typeof data === 'object' &&
      typeof data.resourceCode === 'string' &&
      typeof data.category === 'string' &&
      typeof data.collegeId === 'string' &&
      data.resourceCode.length > 0 &&
      data.category.length > 0 &&
      data.collegeId.length > 0 &&
      (data.startedDate ? this.isValidDate(data.startedDate) : true) &&
      (data.latitude ? this.isValidLatitude(data.latitude) : true) &&
      (data.longitude ? this.isValidLongitude(data.longitude) : true)
    );
  }

  /**
   * Validate update resource request
   */
  static validateUpdateresourceRequest(data: any): data is UpdateresourceRequest {
    if (typeof data !== 'object') return false;
    
    const validFields = ['category', 'locationDescription', 'latitude', 'longitude', 
                        'assignedStudentId', 'assignedDate', 'status', 'departmentId', 'notes'];
    const hasValidFields = Object.keys(data).every(key => validFields.includes(key));
    
    if (!hasValidFields) return false;
    
    // Validate coordinates if provided
    if (data.latitude && !this.isValidLatitude(data.latitude)) return false;
    if (data.longitude && !this.isValidLongitude(data.longitude)) return false;
    
    // Validate status if provided
    if (data.status && !this.isValidresourcestatus(data.status)) return false;
    
    return true;
  }

  /**
   * Create resource with details
   */
  static createresourceWithDetails(
    resource: resource,
    collegeName?: string,
    departmentName?: string,
    studentName?: string,
    studentEmail?: string,
    studentRollNumber?: string
  ): resourceWithDetails {
    const daysSincestarted = this.calculateDaysSincestarted(resource.startedDate);
    const healthScore = this.calculateHealthScore(resource.status, daysSincestarted);
    
    return {
      ...resource,
      collegeName,
      departmentName,
      studentName,
      studentEmail,
      studentRollNumber,
      daysSincestarted,
      healthScore,
      lastUpdated: this.formatDate(resource.updatedAt),
    };
  }

  /**
   * Validate resource code format
   */
  static isValidresourceCode(resourceCode: string): boolean {
    // resource code should be alphanumeric and 6-12 characters
    const resourceCodeRegex = /^[A-Z0-9]{6,12}$/;
    return resourceCodeRegex.test(resourceCode.toUpperCase());
  }

  /**
   * Validate latitude
   */
  static isValidLatitude(lat: number): boolean {
    return typeof lat === 'number' && lat >= -90 && lat <= 90;
  }

  /**
   * Validate longitude
   */
  static isValidLongitude(lng: number): boolean {
    return typeof lng === 'number' && lng >= -180 && lng <= 180;
  }

  /**
   * Validate resource status
   */
  static isValidresourcestatus(status: string): boolean {
    const validStatuses = ['assigned', 'started', 'growing', 'healthy', 'needs_attention', 'dead', 'removed'];
    return validStatuses.includes(status);
  }

  /**
   * Validate date
   */
  static isValidDate(date: any): boolean {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate <= new Date();
  }

  /**
   * Generate resource code
   */
  static generateresourceCode(collegeCode: string, category: string, sequence: number): string {
    const categoryCode = category.substring(0, 3).toUpperCase();
    const sequenceStr = sequence.toString().padStart(4, '0');
    return `${collegeCode}${categoryCode}${sequenceStr}`;
  }

  /**
   * Calculate days since started
   */
  static calculateDaysSincestarted(startedDate: Date): number {
    const now = new Date();
    const started = new Date(startedDate);
    const diffTime = Math.abs(now.getTime() - started.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate health score based on status and age
   */
  static calculateHealthScore(status: resourcestatus, daysSincestarted: number): number {
    const statusScores = {
      healthy: 100,
      growing: 85,
      started: 70,
      assigned: 50,
      needs_attention: 30,
      dead: 0,
      removed: 0,
    };

    let baseScore = statusScores[status] || 50;
    
    // Adjust score based on age (older resources that are healthy get higher scores)
    if (status === 'healthy' && daysSincestarted > 365) {
      baseScore = Math.min(100, baseScore + Math.floor(daysSincestarted / 365) * 5);
    }
    
    return baseScore;
  }

  /**
   * Get status display text
   */
  static getStatusDisplay(status: resourcestatus): string {
    const statusMap = {
      assigned: 'Assigned',
      started: 'started',
      growing: 'Growing',
      healthy: 'Healthy',
      needs_attention: 'Needs Attention',
      dead: 'Dead',
      removed: 'Removed',
    };
    return statusMap[status] || status;
  }

  /**
   * Get status color for UI
   */
  static getStatusColor(status: resourcestatus): string {
    const colorMap = {
      assigned: '#6B7280',
      started: '#3B82F6',
      growing: '#10B981',
      healthy: '#059669',
      needs_attention: '#F59E0B',
      dead: '#EF4444',
      removed: '#6B7280',
    };
    return colorMap[status] || '#6B7280';
  }

  /**
   * Check if resource can be assigned to student
   */
  static canAssignToStudent(resource: resource): boolean {
    return !resource.assignedStudentId && ['assigned', 'started'].includes(resource.status);
  }

  /**
   * Check if resource needs attention
   */
  static needsAttention(resource: resource, daysSincestarted: number): boolean {
    if (resource.status === 'needs_attention') return true;
    
    // resources started more than 30 days ago without status update might need attention
    // resources started more than 30 days ago without status update might need attention
    // if (resource.status === 'started' && daysSincestarted > 30) return true;
    
    return false;
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  /**
   * Calculate distance between two coordinates
   */
  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
