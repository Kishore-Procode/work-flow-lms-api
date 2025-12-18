import { User, LoginRequest, LoginResponse, AuthTokenPayload } from '../../../types';
import { userRepository } from '../../user/repositories/user.repository';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  validatePasswordStrength,
} from '../../../utils/auth.utils';

// Utility function to convert snake_case to camelCase
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

// Utility function to convert object keys from snake_case to camelCase
const convertKeysToCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase);
  if (obj instanceof Date) return obj; // Preserve Date objects
  if (typeof obj !== 'object') return obj;

  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    converted[camelKey] = convertKeysToCamelCase(value);
  }
  return converted;
};

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  async login(loginData: LoginRequest, selectedRole:string, allowedRoles?: string[]): Promise<LoginResponse> {
    const { email, password } = loginData;    

    // Check if input is email format or registration number
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    console.log('Login attempt:', { email, isEmail });

    let user;
    if (isEmail) {
      // Find user by email
      user = await userRepository.findByEmail(email.toLowerCase());
      console.log("user",user);
      
      console.log('User found by email:', user ? { id: user.id, email: user.email, status: user.status } : 'Not found');
    } else {
      // Find user by registration number (roll_number field)
      user = await userRepository.findByRegistrationNumber(email.toUpperCase());
      console.log('User found by registration number:', user ? { id: user.id, email: user.email, status: user.status } : 'Not found');
    }

    if (!user) {
      console.log('Login failed: User not found');
      if (isEmail) {
        throw new Error('No account found with this email address');
      } else {
        throw new Error('No account found with this registration number');
      }
    }

    // Check if user is active
    if (user.status !== 'active') {
      console.log('Login failed: Account not active', { status: user.status });
      switch (user.status) {
        case 'pending':
          throw new Error('Your account is pending approval. Please wait for administrator approval.');
        case 'suspended':
          throw new Error('Your account has been suspended. Please contact the administrator.');
        case 'inactive':
          throw new Error('Your account is inactive. Please contact the administrator to reactivate.');
        default:
          throw new Error('Account is not active. Please contact administrator.');
      }
    }

    // Verify password
    console.log('Verifying password for user:', user.email);
    const isPasswordValid = await comparePassword(password, user.password_hash);
    console.log('Password verification result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Login failed: Invalid password');
      throw new Error('Incorrect password. Please check your password and try again.');
    }

    // Check role-based access restrictions
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        console.log('Login failed: Role not allowed', { userRole: user.role, allowedRoles });

        // Provide specific error messages based on the user's role and allowed roles
        if (user.role === 'student' && allowedRoles.every(role => ['admin', 'principal', 'hod', 'staff'].includes(role))) {
          throw new Error('Students cannot access the faculty login. Please use the student login page.');
        } else if (['admin', 'principal', 'hod', 'staff'].includes(user.role) && allowedRoles.includes('student')) {
          throw new Error('Faculty members cannot access the student login. Please use the faculty login page.');
        } else {
          throw new Error(`Access denied. This login is restricted to ${allowedRoles.join(', ')} users only.`);
        }
      }
    }

    if (selectedRole) {
  if (selectedRole === "student") {
    if (user.role !== "student") {
      throw new Error("Invalid role selected: Expected student");
    }
  } else if (selectedRole === "faculty") {
    const facultyRoles = ["hod", "principal", "staff", "admin"];
    if (!facultyRoles.includes(user.role)) {
      throw new Error("Invalid role selected: Expected faculty role");
    }
  } else {
    throw new Error("Invalid role selected");
  }
}

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Create token payload
    const tokenPayload: AuthTokenPayload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      collegeId: user.college_id,
      departmentId: user.department_id,
    };

    // Generate tokens
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Remove password hash from user object and convert to camelCase
    const { password_hash, ...userWithoutPassword } = user;
    const userCamelCase = convertKeysToCamelCase(userWithoutPassword);

    return {
      user: userCamelCase,
      token: accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Check if user still exists and is active
      const user = await userRepository.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== 'active') {
        throw new Error('User account is not active');
      }

      // Create new token payload with updated data
      const tokenPayload: AuthTokenPayload = {
        id: user.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        collegeId: user.college_id,
        departmentId: user.department_id,
      };

      // Generate new tokens
      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      return {
        token: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Find user
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const success = await userRepository.updatePassword(userId, newPasswordHash);
    if (!success) {
      throw new Error('Failed to update password');
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as any;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateData: {
      name?: string;
      phone?: string;
      profileImageUrl?: string;
    }
  ): Promise<Omit<User, 'passwordHash'>> {
    const updatedUser = await userRepository.updateUser(userId, updateData);
    if (!updatedUser) {
      throw new Error('Failed to update profile');
    }

    const { password_hash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as any;
  }
}
