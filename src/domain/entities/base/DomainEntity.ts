/**
 * Base Domain Entity
 * 
 * Abstract base class for all domain entities in the Student-ACT LMS system.
 * Provides common functionality and ensures consistent entity behavior.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';

export abstract class DomainEntity<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = props;
  }

  /**
   * Generate a new unique identifier
   */
  protected static generateId(): string {
    return uuidv4();
  }

  /**
   * Check equality based on identity
   */
  public equals(entity: DomainEntity<T>): boolean {
    if (!(entity instanceof this.constructor)) {
      return false;
    }

    return this.getId() === entity.getId();
  }

  /**
   * Get the entity's unique identifier
   */
  public abstract getId(): string;

  /**
   * Get a copy of the entity's properties
   */
  protected getProps(): T {
    return { ...this.props };
  }
}
