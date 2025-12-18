/**
 * Distance Calculation Service
 *
 * Service for calculating geographical distances between two points
 * using the Haversine formula for accurate distance measurement.
 *
 * Features:
 * - Distance calculation between two coordinates
 * - Multiple unit support (kilometers, miles, meters)
 * - High precision calculations using Haversine formula
 *
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { appLogger } from '../../../utils/logger';

export interface DistanceResult {
  kilometers: number;
  miles: number;
  meters: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class DistanceService {
  /**
   * Calculate distance between two geographical points using Haversine formula
   *
   * @param lat1 - Latitude of first point
   * @param lon1 - Longitude of first point
   * @param lat2 - Latitude of second point
   * @param lon2 - Longitude of second point
   * @returns Distance in kilometers, miles, and meters
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): DistanceResult {
    try {
      const R = 6371; // Radius of Earth in kilometers

      // Convert degrees to radians
      const toRad = (degree: number): number => degree * (Math.PI / 180);

      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);

      const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const distanceKm = R * c;
      const distanceMiles = distanceKm * 0.621371;
      const distanceMeters = distanceKm * 1000;

      return {
          kilometers: parseFloat(distanceKm.toFixed(3)),
          miles: parseFloat(distanceMiles.toFixed(3)),
          meters: parseFloat(distanceMeters.toFixed(2))
      };
    } catch (error) {
      appLogger.error('Error calculating distance:', error);
      throw new Error('Failed to calculate distance');
    }
  }

  /**
   * Calculate distance using coordinate objects
   *
   * @param point1 - First coordinate point
   * @param point2 - Second coordinate point
   * @returns Distance in kilometers, miles, and meters
   */
  static calculateDistanceFromCoordinates(point1: Coordinates, point2: Coordinates): DistanceResult {
    return this.calculateDistance(point1.latitude, point1.longitude, point2.latitude, point2.longitude);
  }

  /**
   * Check if two points are within a specified distance
   *
   * @param lat1 - Latitude of first point
   * @param lon1 - Longitude of first point
   * @param lat2 - Latitude of second point
   * @param lon2 - Longitude of second point
   * @param maxDistanceKm - Maximum distance in kilometers
   * @returns True if points are within the specified distance
   */
  static isWithinDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    maxDistanceKm: number
  ): boolean {
    const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    return distance.kilometers <= maxDistanceKm;
  }
}

export default DistanceService;