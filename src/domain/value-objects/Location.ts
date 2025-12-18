/**
 * Location Value Object
 * 
 * Represents a geographical location with latitude and longitude.
 * Immutable value object with distance calculation capabilities.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainError } from '../errors/DomainError';

export class Location {
  private readonly _latitude: number;
  private readonly _longitude: number;

  private constructor(latitude: number, longitude: number) {
    this._latitude = latitude;
    this._longitude = longitude;
  }

  /**
   * Create a location
   */
  public static create(latitude: number, longitude: number): Location {
    // Validate latitude
    if (latitude < -90 || latitude > 90) {
      throw DomainError.validation('Latitude must be between -90 and 90 degrees');
    }

    // Validate longitude
    if (longitude < -180 || longitude > 180) {
      throw DomainError.validation('Longitude must be between -180 and 180 degrees');
    }

    return new Location(latitude, longitude);
  }

  /**
   * Create from string coordinates (e.g., "12.9716,77.5946")
   */
  public static fromString(coordinates: string): Location {
    if (!coordinates?.trim()) {
      throw DomainError.validation('Coordinates string is required');
    }

    const parts = coordinates.trim().split(',');
    if (parts.length !== 2) {
      throw DomainError.validation('Coordinates must be in format "latitude,longitude"');
    }

    const latitude = parseFloat(parts[0].trim());
    const longitude = parseFloat(parts[1].trim());

    if (isNaN(latitude) || isNaN(longitude)) {
      throw DomainError.validation('Invalid coordinate values');
    }

    return Location.create(latitude, longitude);
  }

  /**
   * Get latitude
   */
  public get latitude(): number {
    return this._latitude;
  }

  /**
   * Get longitude
   */
  public get longitude(): number {
    return this._longitude;
  }

  /**
   * Calculate distance to another location in kilometers
   * Uses Haversine formula
   */
  public distanceTo(other: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(other._latitude - this._latitude);
    const dLon = this.toRadians(other._longitude - this._longitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(this._latitude)) * Math.cos(this.toRadians(other._latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate distance in miles
   */
  public distanceToMiles(other: Location): number {
    return this.distanceTo(other) * 0.621371;
  }

  /**
   * Check if location is within radius of another location
   */
  public isWithinRadius(other: Location, radiusKm: number): boolean {
    return this.distanceTo(other) <= radiusKm;
  }

  /**
   * Get bearing to another location in degrees
   */
  public bearingTo(other: Location): number {
    const dLon = this.toRadians(other._longitude - this._longitude);
    const lat1 = this.toRadians(this._latitude);
    const lat2 = this.toRadians(other._latitude);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const bearing = this.toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360; // Normalize to 0-360
  }

  /**
   * Get cardinal direction to another location
   */
  public cardinalDirectionTo(other: Location): string {
    const bearing = this.bearingTo(other);
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  }

  /**
   * Check if location is in India
   */
  public isInIndia(): boolean {
    // Approximate bounding box for India
    return this._latitude >= 6.0 && this._latitude <= 37.6 &&
           this._longitude >= 68.7 && this._longitude <= 97.25;
  }

  /**
   * Check if location is in a specific country (basic implementation)
   */
  public isInCountry(country: string): boolean {
    switch (country.toLowerCase()) {
      case 'india':
        return this.isInIndia();
      // Add more countries as needed
      default:
        return false;
    }
  }

  /**
   * Get timezone offset (basic implementation for India)
   */
  public getTimezoneOffset(): number {
    if (this.isInIndia()) {
      return 5.5; // IST is UTC+5:30
    }
    return 0; // Default to UTC
  }

  /**
   * Format as string
   */
  public toString(): string {
    return `${this._latitude},${this._longitude}`;
  }

  /**
   * Format for display with precision
   */
  public format(precision: number = 6): string {
    return `${this._latitude.toFixed(precision)}, ${this._longitude.toFixed(precision)}`;
  }

  /**
   * Format as Google Maps URL
   */
  public toGoogleMapsUrl(): string {
    return `https://www.google.com/maps?q=${this._latitude},${this._longitude}`;
  }

  /**
   * Format as coordinates object
   */
  public toCoordinates(): { latitude: number; longitude: number } {
    return {
      latitude: this._latitude,
      longitude: this._longitude,
    };
  }

  /**
   * Get quadrant (NE, NW, SE, SW) relative to origin (0,0)
   */
  public getQuadrant(): string {
    const ns = this._latitude >= 0 ? 'N' : 'S';
    const ew = this._longitude >= 0 ? 'E' : 'W';
    return ns + ew;
  }

  /**
   * Check if location is valid for learning resource placement
   */
  public isValidForLearningResource(): boolean {
    // Must be on land (not in ocean) - basic check
    // This is a simplified check, in reality you'd use a more sophisticated service
    return this._latitude !== 0 || this._longitude !== 0; // Not at null island
  }

  /**
   * Get approximate address (placeholder - would integrate with geocoding service)
   */
  public getApproximateAddress(): string {
    if (this.isInIndia()) {
      return `Location in India (${this.format(4)})`;
    }
    return `Location (${this.format(4)})`;
  }

  /**
   * Create a bounding box around this location
   */
  public getBoundingBox(radiusKm: number): {
    northEast: Location;
    southWest: Location;
  } {
    // Approximate degrees per kilometer
    const latDegPerKm = 1 / 111.32;
    const lonDegPerKm = 1 / (111.32 * Math.cos(this.toRadians(this._latitude)));

    const latOffset = radiusKm * latDegPerKm;
    const lonOffset = radiusKm * lonDegPerKm;

    return {
      northEast: Location.create(
        Math.min(90, this._latitude + latOffset),
        Math.min(180, this._longitude + lonOffset)
      ),
      southWest: Location.create(
        Math.max(-90, this._latitude - latOffset),
        Math.max(-180, this._longitude - lonOffset)
      ),
    };
  }

  /**
   * Equality check
   */
  public equals(other: Location): boolean {
    const precision = 0.000001; // About 0.1 meters
    return Math.abs(this._latitude - other._latitude) < precision &&
           Math.abs(this._longitude - other._longitude) < precision;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * JSON serialization
   */
  public toJSON(): { latitude: number; longitude: number } {
    return {
      latitude: this._latitude,
      longitude: this._longitude,
    };
  }
}
