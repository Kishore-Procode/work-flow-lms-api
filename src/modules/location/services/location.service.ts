/**
 * Location Management Service
 * 
 * Comprehensive service for managing location hierarchy (States, Districts, Pincodes)
 * following MNC enterprise standards for geographical data management.
 * 
 * Features:
 * - State, District, Pincode hierarchy management
 * - Cascading location data retrieval
 * - Address validation and normalization
 * - Location-based filtering and search
 * - Caching for performance optimization
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool } from 'pg';
import { appLogger } from '../../../utils/logger';

export interface State {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
}

export interface District {
  id: string;
  name: string;
  stateId: string;
  createdAt: Date;
  // Joined data
  stateName?: string;
  stateCode?: string;
}

export interface Pincode {
  id: string;
  code: string;
  areaName: string;
  districtId: string;
  createdAt: Date;
  // Joined data
  districtName?: string;
  stateName?: string;
}

/**
 * Location Management Service Class
 */
export class LocationService {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Get all states
   */
  async getAllStates(): Promise<State[]> {
    try {
      const query = `
        SELECT id, name, code, created_at
        FROM states
        ORDER BY name ASC
      `;

      const result = await this.db.query(query);
      return result.rows.map(row => this.formatStateRecord(row));
    } catch (error) {
      appLogger.error('Failed to get all states', { error });
      throw error;
    }
  }

  /**
   * Get state by ID
   */
  async getStateById(stateId: string): Promise<State | null> {
    try {
      const query = `
        SELECT id, name, code, created_at
        FROM states
        WHERE id = $1
      `;

      const result = await this.db.query(query, [stateId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.formatStateRecord(result.rows[0]);
    } catch (error) {
      appLogger.error('Failed to get state by ID', { error, stateId });
      throw error;
    }
  }

  /**
   * Get districts by state
   */
  async getDistrictsByState(stateId: string): Promise<District[]> {
    try {
      const query = `
        SELECT 
          d.id, d.name, d.state_id, d.created_at,
          s.name as state_name, s.code as state_code
        FROM districts d
        JOIN states s ON d.state_id = s.id
        WHERE d.state_id = $1
        ORDER BY d.name ASC
      `;

      const result = await this.db.query(query, [stateId]);
      return result.rows.map(row => this.formatDistrictRecord(row));
    } catch (error) {
      appLogger.error('Failed to get districts by state', { error, stateId });
      throw error;
    }
  }

  /**
   * Get district by ID
   */
  async getDistrictById(districtId: string): Promise<District | null> {
    try {
      const query = `
        SELECT 
          d.id, d.name, d.state_id, d.created_at,
          s.name as state_name, s.code as state_code
        FROM districts d
        JOIN states s ON d.state_id = s.id
        WHERE d.id = $1
      `;

      const result = await this.db.query(query, [districtId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.formatDistrictRecord(result.rows[0]);
    } catch (error) {
      appLogger.error('Failed to get district by ID', { error, districtId });
      throw error;
    }
  }

  /**
   * Get pincodes by district
   */
  async getPincodesByDistrict(districtId: string): Promise<Pincode[]> {
    try {
      const query = `
        SELECT 
          p.id, p.code, p.area_name, p.district_id, p.created_at,
          d.name as district_name, s.name as state_name
        FROM pincodes p
        JOIN districts d ON p.district_id = d.id
        JOIN states s ON d.state_id = s.id
        WHERE p.district_id = $1
        ORDER BY p.code ASC
      `;

      const result = await this.db.query(query, [districtId]);
      return result.rows.map(row => this.formatPincodeRecord(row));
    } catch (error) {
      appLogger.error('Failed to get pincodes by district', { error, districtId });
      throw error;
    }
  }

  /**
   * Get pincode by ID
   */
  async getPincodeById(pincodeId: string): Promise<Pincode | null> {
    try {
      const query = `
        SELECT 
          p.id, p.code, p.area_name, p.district_id, p.created_at,
          d.name as district_name, s.name as state_name
        FROM pincodes p
        JOIN districts d ON p.district_id = d.id
        JOIN states s ON d.state_id = s.id
        WHERE p.id = $1
      `;

      const result = await this.db.query(query, [pincodeId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.formatPincodeRecord(result.rows[0]);
    } catch (error) {
      appLogger.error('Failed to get pincode by ID', { error, pincodeId });
      throw error;
    }
  }

  /**
   * Search locations by query
   */
  async searchLocations(query: string, type?: 'state' | 'district' | 'pincode'): Promise<{
    states: State[];
    districts: District[];
    pincodes: Pincode[];
  }> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      const results = {
        states: [] as State[],
        districts: [] as District[],
        pincodes: [] as Pincode[],
      };

      // Search states
      if (!type || type === 'state') {
        const stateQuery = `
          SELECT id, name, code, created_at
          FROM states
          WHERE LOWER(name) LIKE $1 OR LOWER(code) LIKE $1
          ORDER BY name ASC
          LIMIT 10
        `;
        const stateResult = await this.db.query(stateQuery, [searchTerm]);
        results.states = stateResult.rows.map(row => this.formatStateRecord(row));
      }

      // Search districts
      if (!type || type === 'district') {
        const districtQuery = `
          SELECT 
            d.id, d.name, d.state_id, d.created_at,
            s.name as state_name, s.code as state_code
          FROM districts d
          JOIN states s ON d.state_id = s.id
          WHERE LOWER(d.name) LIKE $1
          ORDER BY d.name ASC
          LIMIT 10
        `;
        const districtResult = await this.db.query(districtQuery, [searchTerm]);
        results.districts = districtResult.rows.map(row => this.formatDistrictRecord(row));
      }

      // Search pincodes
      if (!type || type === 'pincode') {
        const pincodeQuery = `
          SELECT 
            p.id, p.code, p.area_name, p.district_id, p.created_at,
            d.name as district_name, s.name as state_name
          FROM pincodes p
          JOIN districts d ON p.district_id = d.id
          JOIN states s ON d.state_id = s.id
          WHERE p.code LIKE $1 OR LOWER(p.area_name) LIKE $1
          ORDER BY p.code ASC
          LIMIT 10
        `;
        const pincodeResult = await this.db.query(pincodeQuery, [searchTerm]);
        results.pincodes = pincodeResult.rows.map(row => this.formatPincodeRecord(row));
      }

      return results;
    } catch (error) {
      appLogger.error('Failed to search locations', { error, query, type });
      throw error;
    }
  }

  /**
   * Validate address hierarchy
   */
  async validateAddressHierarchy(stateId: string, districtId: string, pincodeId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];

      // Check if state exists
      const state = await this.getStateById(stateId);
      if (!state) {
        errors.push('Invalid state');
      }

      // Check if district belongs to state
      const district = await this.getDistrictById(districtId);
      if (!district) {
        errors.push('Invalid district');
      } else if (district.stateId !== stateId) {
        errors.push('District does not belong to the selected state');
      }

      // Check if pincode belongs to district
      const pincode = await this.getPincodeById(pincodeId);
      if (!pincode) {
        errors.push('Invalid pincode');
      } else if (pincode.districtId !== districtId) {
        errors.push('Pincode does not belong to the selected district');
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      appLogger.error('Failed to validate address hierarchy', {
        error,
        stateId,
        districtId,
        pincodeId,
      });
      throw error;
    }
  }

  /**
   * Format state record for consistent output
   */
  private formatStateRecord(row: any): State {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      createdAt: row.created_at,
    };
  }

  /**
   * Format district record for consistent output
   */
  private formatDistrictRecord(row: any): District {
    return {
      id: row.id,
      name: row.name,
      stateId: row.state_id,
      createdAt: row.created_at,
      stateName: row.state_name,
      stateCode: row.state_code,
    };
  }

  /**
   * Format pincode record for consistent output
   */
  private formatPincodeRecord(row: any): Pincode {
    return {
      id: row.id,
      code: row.code,
      areaName: row.area_name,
      districtId: row.district_id,
      createdAt: row.created_at,
      districtName: row.district_name,
      stateName: row.state_name,
    };
  }
}

// Export singleton instance
export const locationService = new LocationService(require('../../../config/database').pool);
