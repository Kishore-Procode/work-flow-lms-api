import { BaseRepository } from '../../../models/base.repository';

export interface ApprovalWorkflow {
  id: string;
  requestType: 'student_registration' | 'staff_registration' | 'hod_registration' | 'principal_registration';
  requestId: string;
  currentApproverRole: string;
  currentApproverId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowData {
  requestType: 'student_registration' | 'staff_registration' | 'hod_registration' | 'principal_registration';
  requestId: string;
  currentApproverRole: string;
  currentApproverId?: string;
}

class ApprovalWorkflowRepository extends BaseRepository<ApprovalWorkflow> {
  constructor() {
    super('approval_workflows');
  }
  /**
   * Create approval workflow
   */
  async createWorkflow(workflowData: CreateWorkflowData): Promise<ApprovalWorkflow> {
    const query = `
      INSERT INTO approval_workflows (
        request_type, request_id, current_approver_role, current_approver_id
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      workflowData.requestType,
      workflowData.requestId,
      workflowData.currentApproverRole,
      workflowData.currentApproverId
    ];

    const result = await this.query<ApprovalWorkflow>(query, values);
    return result.rows[0];
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(id: string): Promise<ApprovalWorkflow | null> {
    const query = 'SELECT * FROM approval_workflows WHERE id = $1';
    const result = await this.query<ApprovalWorkflow>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get pending approvals by role
   */
  async getPendingApprovalsByRole(role: string, userId?: string): Promise<any[]> {
    let query = `
      SELECT 
        aw.*,
        rr.name, rr.email, rr.phone, rr.role as requested_role,
        rr.college_id, rr.department_id,
        c.name as college_name,
        d.name as department_name
      FROM approval_workflows aw
      JOIN registration_requests rr ON aw.request_id = rr.id
      LEFT JOIN colleges c ON rr.college_id = c.id
      LEFT JOIN departments d ON rr.department_id = d.id
      WHERE aw.status = 'pending' AND aw.current_approver_role = $1
    `;

    const values: any[] = [role];

    // For specific approver assignment
    if (userId) {
      query += ' AND (aw.current_approver_id IS NULL OR aw.current_approver_id = $2)';
      values.push(userId);
    }

    query += ' ORDER BY aw.created_at ASC';

    const result = await this.query(query, values);
    return result.rows;
  }

  /**
   * Approve request and move to next level
   */
  async approveRequest(workflowId: string, approverId: string): Promise<{ isFinalApproval: boolean; nextWorkflow?: ApprovalWorkflow }> {
    // Get current workflow
    const workflow = await this.getWorkflowById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Update current workflow as approved
    await this.query(
      `UPDATE approval_workflows 
       SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [approverId, workflowId]
    );

    // Determine next approval level
    const nextApproverRole = this.getNextApproverRole(workflow.requestType, workflow.currentApproverRole);

    if (!nextApproverRole) {
      // Final approval reached
      return { isFinalApproval: true };
    }

    // Create next workflow
    const nextWorkflow = await this.createWorkflow({
      requestType: workflow.requestType,
      requestId: workflow.requestId,
      currentApproverRole: nextApproverRole,
      currentApproverId: await this.getApproverForRole(nextApproverRole, workflow.requestId)
    });

    return { isFinalApproval: false, nextWorkflow };
  }

  /**
   * Reject request
   */
  async rejectRequest(workflowId: string, rejectedBy: string, rejectionReason: string): Promise<void> {
    await this.query(
      `UPDATE approval_workflows 
       SET status = 'rejected', approved_by = $1, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [rejectedBy, rejectionReason, workflowId]
    );
  }

  /**
   * Get approval history for a request
   */
  async getApprovalHistory(requestId: string): Promise<any[]> {
    const query = `
      SELECT 
        aw.*,
        u.name as approver_name,
        u.email as approver_email
      FROM approval_workflows aw
      LEFT JOIN users u ON aw.approved_by = u.id
      WHERE aw.request_id = $1
      ORDER BY aw.created_at ASC
    `;

    const result = await this.query(query, [requestId]);
    return result.rows;
  }

  /**
   * Get approval statistics
   */
  async getApprovalStatistics(filters: { collegeId?: string }): Promise<any> {
    let query = `
      SELECT 
        aw.request_type,
        aw.status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (aw.approved_at - aw.created_at))/3600) as avg_approval_time_hours
      FROM approval_workflows aw
      JOIN registration_requests rr ON aw.request_id = rr.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (filters.collegeId) {
      query += ` AND rr.college_id = $${paramIndex}`;
      values.push(filters.collegeId);
      paramIndex++;
    }

    query += ' GROUP BY aw.request_type, aw.status ORDER BY count DESC';

    const result = await this.query(query, values);
    return result.rows;
  }

  /**
   * Get next approver role based on request type and current role
   */
  private getNextApproverRole(requestType: string, currentRole: string): string | null {
    const approvalChain: Record<string, string[]> = {
      'student_registration': ['staff', 'hod', 'principal'],
      'staff_registration': ['hod', 'principal'],
      'hod_registration': ['principal'],
      'principal_registration': ['admin']
    };

    const chain = approvalChain[requestType];
    if (!chain) return null;

    const currentIndex = chain.indexOf(currentRole);
    if (currentIndex === -1 || currentIndex === chain.length - 1) {
      return null; // Final approval or invalid role
    }

    return chain[currentIndex + 1];
  }

  /**
   * Get specific approver for a role based on request context
   */
  private async getApproverForRole(role: string, requestId: string): Promise<string | undefined> {
    // Get registration request details
    const requestQuery = 'SELECT * FROM registration_requests WHERE id = $1';
    const requestResult = await this.query(requestQuery, [requestId]);
    const registrationRequest = requestResult.rows[0] as any;

    if (!registrationRequest) return undefined;

    let approverQuery = '';
    const values: any[] = [];

    switch (role) {
      case 'staff':
        // For student requests, find staff who is class in charge of the student's class
        if (registrationRequest.role === 'student' && registrationRequest.class) {
          // First try to find staff with matching class_in_charge
          approverQuery = `
            SELECT id FROM users
            WHERE role = 'staff'
            AND department_id = $1
            AND class_in_charge = $2
            AND status = 'active'
            LIMIT 1
          `;
          values.push(registrationRequest.department_id, registrationRequest.class);

          // Check if we found a class in charge
          const classStaffResult = await this.query(approverQuery, values);
          if (classStaffResult.rows.length > 0) {
            return classStaffResult.rows[0].id;
          }

          // Fallback: Find any staff in the same department
          console.log(`⚠️  No class in charge found for class ${registrationRequest.class}, assigning to any staff in department`);
          approverQuery = `
            SELECT id FROM users
            WHERE role = 'staff' AND department_id = $1 AND status = 'active'
            LIMIT 1
          `;
          values.length = 0; // Clear values array
          values.push(registrationRequest.department_id);
        } else {
          // For other requests, find any staff in the same department
          approverQuery = `
            SELECT id FROM users
            WHERE role = 'staff' AND department_id = $1 AND status = 'active'
            LIMIT 1
          `;
          values.push(registrationRequest.department_id);
        }
        break;

      case 'hod':
        // Find HOD of the department
        approverQuery = `
          SELECT id FROM users
          WHERE role = 'hod' AND department_id = $1 AND status = 'active'
          LIMIT 1
        `;
        values.push(registrationRequest.department_id);
        break;

      case 'principal':
        // Find principal of the college
        approverQuery = `
          SELECT id FROM users
          WHERE role = 'principal' AND college_id = $1 AND status = 'active'
          LIMIT 1
        `;
        values.push(registrationRequest.college_id);
        break;

      case 'admin':
        // Find any admin
        approverQuery = `
          SELECT id FROM users
          WHERE role = 'admin' AND status = 'active'
          LIMIT 1
        `;
        break;

      default:
        return undefined;
    }

    const approverResult = await this.query(approverQuery, values);
    return approverResult.rows[0]?.id;
  }
}

export const approvalWorkflowRepository = new ApprovalWorkflowRepository();
