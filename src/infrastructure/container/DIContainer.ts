/**
 * Dependency Injection Container
 * 
 * IoC container that wires up all dependencies for Clean Architecture.
 * Ensures proper dependency inversion and makes the system testable.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool } from 'pg';

// Domain interfaces
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IDepartmentRepository } from '../../domain/repositories/IDepartmentRepository';
import { ILearningResourceRepository } from '../../domain/repositories/ILearningResourceRepository';
import { ICourseTypeRepository } from '../../domain/repositories/ICourseTypeRepository';
import { IStudentSubjectEnrollmentRepository } from '../../domain/repositories/IStudentSubjectEnrollmentRepository';

// Application interfaces
import { IPasswordService } from '../../application/interfaces/IPasswordService';
import { ITokenService } from '../../application/interfaces/ITokenService';

// Use cases
import { LoginUserUseCase } from '../../application/use-cases/auth/LoginUserUseCase';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/RefreshTokenUseCase';
import { GetUsersUseCase } from '../../application/use-cases/user/GetUsersUseCase';
import { GetUserByIdUseCase } from '../../application/use-cases/user/GetUserByIdUseCase';
// import { CreateUserUseCase } from '../../application/use-cases/user/CreateUserUseCase';
// import { UpdateUserUseCase } from '../../application/use-cases/user/UpdateUserUseCase';
// import { DeleteUserUseCase } from '../../application/use-cases/user/DeleteUserUseCase';
import { CreateDepartmentUseCase } from '../../application/use-cases/department/CreateDepartmentUseCase';
import { GetDepartmentsUseCase } from '../../application/use-cases/department/GetDepartmentsUseCase';
import { GetDropdownDataUseCase } from '../../application/use-cases/content-mapping/GetDropdownDataUseCase';
import { LoadSemestersUseCase } from '../../application/use-cases/content-mapping/LoadSemestersUseCase';
import { GetSubjectsUseCase } from '../../application/use-cases/content-mapping/GetSubjectsUseCase';
import { AssignSubjectsUseCase } from '../../application/use-cases/content-mapping/AssignSubjectsUseCase';
import { GetCurrentSemesterUseCase } from '../../application/use-cases/student-enrollment/GetCurrentSemesterUseCase';
import { GetAvailableSubjectsUseCase } from '../../application/use-cases/student-enrollment/GetAvailableSubjectsUseCase';
import { EnrollSubjectsUseCase } from '../../application/use-cases/student-enrollment/EnrollSubjectsUseCase';
import { GetEnrolledSubjectsUseCase } from '../../application/use-cases/student-enrollment/GetEnrolledSubjectsUseCase';
import { GetSubjectLearningContentUseCase } from '../../application/use-cases/student-enrollment/GetSubjectLearningContentUseCase';

// Use Cases - Play Session
import { GetSessionBySubjectUseCase } from '../../application/use-cases/play-session/GetSessionBySubjectUseCase';
import { GetSessionContentBlocksUseCase } from '../../application/use-cases/play-session/GetSessionContentBlocksUseCase';
import { GetUserProgressUseCase } from '../../application/use-cases/play-session/GetUserProgressUseCase';
import { GetBulkUserProgressUseCase } from '../../application/use-cases/play-session/GetBulkUserProgressUseCase';
import { UpdateSessionProgressUseCase } from '../../application/use-cases/play-session/UpdateSessionProgressUseCase';
import { GetSessionCommentsUseCase } from '../../application/use-cases/play-session/GetSessionCommentsUseCase';
import { CreateSessionCommentUseCase } from '../../application/use-cases/play-session/CreateSessionCommentUseCase';
import { GetQuizQuestionsUseCase } from '../../application/use-cases/play-session/GetQuizQuestionsUseCase';
import { SubmitQuizAttemptUseCase } from '../../application/use-cases/play-session/SubmitQuizAttemptUseCase';
import { MapSubjectToSessionUseCase } from '../../application/use-cases/play-session/MapSubjectToSessionUseCase';
import { GetCourseStructureUseCase } from '../../application/use-cases/play-session/GetCourseStructureUseCase';
import { SubmitAssignmentUseCase } from '../../application/use-cases/play-session/SubmitAssignmentUseCase';
import { GradeAssignmentUseCase } from '../../application/use-cases/play-session/GradeAssignmentUseCase';
import { GetAssignmentSubmissionStatusUseCase } from '../../application/use-cases/play-session/GetAssignmentSubmissionStatusUseCase';
import { GetStaffAssignmentSubmissionsUseCase } from '../../application/use-cases/play-session/GetStaffAssignmentSubmissionsUseCase';

// Controllers
import { AuthController } from '../../interface-adapters/controllers/AuthController';
import { UserController } from '../../interface-adapters/controllers/UserController';
import { DepartmentController } from '../../interface-adapters/controllers/DepartmentController';
import { StudentEnrollmentController } from '../../interface-adapters/controllers/StudentEnrollmentController';
import { PlaySessionController } from '../../interface-adapters/controllers/PlaySessionController';

// Infrastructure implementations
import { PostgreSQLUserRepository } from '../repositories/PostgreSQLUserRepository';
import { PostgreSQLDepartmentRepository } from '../repositories/PostgreSQLDepartmentRepository';
import { PostgreSQLLearningResourceRepository } from '../repositories/PostgreSQLLearningResourceRepository';
import { PostgreSQLCourseTypeRepository } from '../repositories/PostgreSQLCourseTypeRepository';
import { ContentMapMasterRepository, IContentMapMasterRepository } from '../repositories/ContentMapMasterRepository';
import { ContentMapSemDetailsRepository, IContentMapSemDetailsRepository } from '../repositories/ContentMapSemDetailsRepository';
import { ContentMapSubDetailsRepository, IContentMapSubDetailsRepository } from '../repositories/ContentMapSubDetailsRepository';
import { ACTSchemaRepository, IACTSchemaRepository } from '../repositories/ACTSchemaRepository';
import { StudentSubjectEnrollmentRepository } from '../repositories/StudentSubjectEnrollmentRepository';
import { WorkflowSessionRepository, IWorkflowSessionRepository } from '../repositories/WorkflowSessionRepository';
import { BcryptPasswordService } from '../services/BcryptPasswordService';
import { JWTTokenService } from '../services/JWTTokenService';

export interface DIContainerConfig {
  database: {
    pool: Pool;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
}

export class DIContainer {
  private static instance: DIContainer;
  private readonly config: DIContainerConfig;
  
  // Repositories
  private _userRepository?: IUserRepository;
  private _departmentRepository?: IDepartmentRepository;
  private _learningResourceRepository?: ILearningResourceRepository;
  private _courseTypeRepository?: ICourseTypeRepository;
  private _contentMapMasterRepository?: IContentMapMasterRepository;
  private _contentMapSemDetailsRepository?: IContentMapSemDetailsRepository;
  private _contentMapSubDetailsRepository?: IContentMapSubDetailsRepository;
  private _actSchemaRepository?: IACTSchemaRepository;
  private _studentSubjectEnrollmentRepository?: IStudentSubjectEnrollmentRepository;
  private _workflowSessionRepository?: IWorkflowSessionRepository;

  // Services
  private _passwordService?: IPasswordService;
  private _tokenService?: ITokenService;
  
  // Use Cases - Auth
  private _loginUserUseCase?: LoginUserUseCase;
  private _refreshTokenUseCase?: RefreshTokenUseCase;
  
  // Use Cases - User
  private _getUsersUseCase?: GetUsersUseCase;
  private _getUserByIdUseCase?: GetUserByIdUseCase;
  // private _createUserUseCase?: CreateUserUseCase;
  // private _updateUserUseCase?: UpdateUserUseCase;
  // private _deleteUserUseCase?: DeleteUserUseCase;

  // Use Cases - Department
  private _createDepartmentUseCase?: CreateDepartmentUseCase;
  private _getDepartmentsUseCase?: GetDepartmentsUseCase;

  // Use Cases - Content Mapping
  private _getDropdownDataUseCase?: GetDropdownDataUseCase;
  private _loadSemestersUseCase?: LoadSemestersUseCase;
  private _getSubjectsUseCase?: GetSubjectsUseCase;
  private _assignSubjectsUseCase?: AssignSubjectsUseCase;

  // Use Cases - Student Enrollment
  private _getCurrentSemesterUseCase?: GetCurrentSemesterUseCase;
  private _getAvailableSubjectsUseCase?: GetAvailableSubjectsUseCase;
  private _enrollSubjectsUseCase?: EnrollSubjectsUseCase;
  private _getEnrolledSubjectsUseCase?: GetEnrolledSubjectsUseCase;
  private _getSubjectLearningContentUseCase?: GetSubjectLearningContentUseCase;

  // Use Cases - Play Session
  private _getSessionBySubjectUseCase?: GetSessionBySubjectUseCase;
  private _getSessionContentBlocksUseCase?: GetSessionContentBlocksUseCase;
  private _getUserProgressUseCase?: GetUserProgressUseCase;
  private _getBulkUserProgressUseCase?: GetBulkUserProgressUseCase;
  private _updateSessionProgressUseCase?: UpdateSessionProgressUseCase;
  private _getSessionCommentsUseCase?: GetSessionCommentsUseCase;
  private _createSessionCommentUseCase?: CreateSessionCommentUseCase;
  private _getQuizQuestionsUseCase?: GetQuizQuestionsUseCase;
  private _submitQuizAttemptUseCase?: SubmitQuizAttemptUseCase;
  private _mapSubjectToSessionUseCase?: MapSubjectToSessionUseCase;
  private _getCourseStructureUseCase?: GetCourseStructureUseCase;
  private _submitAssignmentUseCase?: SubmitAssignmentUseCase;
  private _gradeAssignmentUseCase?: GradeAssignmentUseCase;
  private _getAssignmentSubmissionStatusUseCase?: GetAssignmentSubmissionStatusUseCase;
  private _getStaffAssignmentSubmissionsUseCase?: GetStaffAssignmentSubmissionsUseCase;

  // Controllers
  private _authController?: AuthController;
  private _userController?: UserController;
  private _departmentController?: DepartmentController;
  private _studentEnrollmentController?: StudentEnrollmentController;
  private _playSessionController?: PlaySessionController;

  private constructor(config: DIContainerConfig) {
    this.config = config;
  }

  /**
   * Initialize the container with configuration
   */
  public static initialize(config: DIContainerConfig): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer(config);
    }
    return DIContainer.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      throw new Error('DIContainer must be initialized before use');
    }
    return DIContainer.instance;
  }

  // Repository getters
  public get userRepository(): IUserRepository {
    if (!this._userRepository) {
      this._userRepository = new PostgreSQLUserRepository(this.config.database.pool);
    }
    return this._userRepository;
  }

  public get departmentRepository(): IDepartmentRepository {
    if (!this._departmentRepository) {
      this._departmentRepository = new PostgreSQLDepartmentRepository(this.config.database.pool);
    }
    return this._departmentRepository;
  }

  public get learningResourceRepository(): ILearningResourceRepository {
    if (!this._learningResourceRepository) {
      this._learningResourceRepository = new PostgreSQLLearningResourceRepository(this.config.database.pool);
    }
    return this._learningResourceRepository;
  }

  public get courseTypeRepository(): ICourseTypeRepository {
    if (!this._courseTypeRepository) {
      this._courseTypeRepository = new PostgreSQLCourseTypeRepository(this.config.database.pool);
    }
    return this._courseTypeRepository;
  }

  public get contentMapMasterRepository(): IContentMapMasterRepository {
    if (!this._contentMapMasterRepository) {
      this._contentMapMasterRepository = new ContentMapMasterRepository(this.config.database.pool);
    }
    return this._contentMapMasterRepository;
  }

  public get contentMapSemDetailsRepository(): IContentMapSemDetailsRepository {
    if (!this._contentMapSemDetailsRepository) {
      this._contentMapSemDetailsRepository = new ContentMapSemDetailsRepository(this.config.database.pool);
    }
    return this._contentMapSemDetailsRepository;
  }

  public get contentMapSubDetailsRepository(): IContentMapSubDetailsRepository {
    if (!this._contentMapSubDetailsRepository) {
      this._contentMapSubDetailsRepository = new ContentMapSubDetailsRepository(this.config.database.pool);
    }
    return this._contentMapSubDetailsRepository;
  }

  public get actSchemaRepository(): IACTSchemaRepository {
    if (!this._actSchemaRepository) {
      this._actSchemaRepository = new ACTSchemaRepository(this.config.database.pool);
    }
    return this._actSchemaRepository;
  }

  public get studentSubjectEnrollmentRepository(): IStudentSubjectEnrollmentRepository {
    if (!this._studentSubjectEnrollmentRepository) {
      this._studentSubjectEnrollmentRepository = new StudentSubjectEnrollmentRepository(this.config.database.pool);
    }
    return this._studentSubjectEnrollmentRepository;
  }

  public get workflowSessionRepository(): IWorkflowSessionRepository {
    if (!this._workflowSessionRepository) {
      this._workflowSessionRepository = new WorkflowSessionRepository(this.config.database.pool);
    }
    return this._workflowSessionRepository;
  }

  // Service getters
  public get passwordService(): IPasswordService {
    if (!this._passwordService) {
      this._passwordService = new BcryptPasswordService();
    }
    return this._passwordService;
  }

  public get tokenService(): ITokenService {
    if (!this._tokenService) {
      this._tokenService = new JWTTokenService({
        secret: this.config.jwt.secret,
        refreshSecret: this.config.jwt.refreshSecret,
        expiresIn: this.config.jwt.expiresIn,
        refreshExpiresIn: this.config.jwt.refreshExpiresIn,
      });
    }
    return this._tokenService;
  }

  // Use Case getters - Auth
  public get loginUserUseCase(): LoginUserUseCase {
    if (!this._loginUserUseCase) {
      this._loginUserUseCase = new LoginUserUseCase(
        this.userRepository,
        this.passwordService,
        this.tokenService
      );
    }
    return this._loginUserUseCase;
  }

  public get refreshTokenUseCase(): RefreshTokenUseCase {
    if (!this._refreshTokenUseCase) {
      this._refreshTokenUseCase = new RefreshTokenUseCase(
        this.userRepository,
        this.tokenService
      );
    }
    return this._refreshTokenUseCase;
  }



  // Use Case getters - User
  public get getUsersUseCase(): GetUsersUseCase {
    if (!this._getUsersUseCase) {
      this._getUsersUseCase = new GetUsersUseCase(
        this.userRepository
      );
    }
    return this._getUsersUseCase;
  }

  public get getUserByIdUseCase(): GetUserByIdUseCase {
    if (!this._getUserByIdUseCase) {
      this._getUserByIdUseCase = new GetUserByIdUseCase(
        this.userRepository
      );
    }
    return this._getUserByIdUseCase;
  }

  // public get createUserUseCase(): CreateUserUseCase {
  //   if (!this._createUserUseCase) {
  //     this._createUserUseCase = new CreateUserUseCase(
  //       this.userRepository,
  //       this.passwordService
  //     );
  //   }
  //   return this._createUserUseCase;
  // }

  // public get updateUserUseCase(): UpdateUserUseCase {
  //   if (!this._updateUserUseCase) {
  //     this._updateUserUseCase = new UpdateUserUseCase(
  //       this.userRepository,
  //       this.passwordService
  //     );
  //   }
  //   return this._updateUserUseCase;
  // }

  // public get deleteUserUseCase(): DeleteUserUseCase {
  //   if (!this._deleteUserUseCase) {
  //     this._deleteUserUseCase = new DeleteUserUseCase(
  //       this.userRepository
  //     );
  //   }
  //   return this._deleteUserUseCase;
  // }

  // Use Case getters - Department
  public get createDepartmentUseCase(): CreateDepartmentUseCase {
    if (!this._createDepartmentUseCase) {
      this._createDepartmentUseCase = new CreateDepartmentUseCase(
        this.departmentRepository,
        this.userRepository
      );
    }
    return this._createDepartmentUseCase;
  }

  public get getDepartmentsUseCase(): GetDepartmentsUseCase {
    if (!this._getDepartmentsUseCase) {
      this._getDepartmentsUseCase = new GetDepartmentsUseCase(
        this.departmentRepository,
        this.userRepository
      );
    }
    return this._getDepartmentsUseCase;
  }

  // Use Case getters - Content Mapping
  public get getDropdownDataUseCase(): GetDropdownDataUseCase {
    if (!this._getDropdownDataUseCase) {
      this._getDropdownDataUseCase = new GetDropdownDataUseCase(
        this.departmentRepository,
        this.actSchemaRepository,
        this.courseTypeRepository
      );
    }
    return this._getDropdownDataUseCase;
  }

  public get loadSemestersUseCase(): LoadSemestersUseCase {
    if (!this._loadSemestersUseCase) {
      this._loadSemestersUseCase = new LoadSemestersUseCase(
        this.contentMapMasterRepository,
        this.contentMapSemDetailsRepository
      );
    }
    return this._loadSemestersUseCase;
  }

  public get getSubjectsUseCase(): GetSubjectsUseCase {
    if (!this._getSubjectsUseCase) {
      this._getSubjectsUseCase = new GetSubjectsUseCase(
        this.contentMapSubDetailsRepository,
        this.contentMapSemDetailsRepository,
        this.contentMapMasterRepository,
        this.actSchemaRepository
      );
    }
    return this._getSubjectsUseCase;
  }

  public get assignSubjectsUseCase(): AssignSubjectsUseCase {
    if (!this._assignSubjectsUseCase) {
      this._assignSubjectsUseCase = new AssignSubjectsUseCase(
        this.contentMapSubDetailsRepository,
        this.contentMapSemDetailsRepository,
        this.actSchemaRepository
      );
    }
    return this._assignSubjectsUseCase;
  }

  // Use Case getters - Student Enrollment
  public get getCurrentSemesterUseCase(): GetCurrentSemesterUseCase {
    if (!this._getCurrentSemesterUseCase) {
      this._getCurrentSemesterUseCase = new GetCurrentSemesterUseCase(
        this.config.database.pool
      );
    }
    return this._getCurrentSemesterUseCase;
  }

  public get getAvailableSubjectsUseCase(): GetAvailableSubjectsUseCase {
    if (!this._getAvailableSubjectsUseCase) {
      this._getAvailableSubjectsUseCase = new GetAvailableSubjectsUseCase(
        this.config.database.pool,
        this.studentSubjectEnrollmentRepository
      );
    }
    return this._getAvailableSubjectsUseCase;
  }

  public get enrollSubjectsUseCase(): EnrollSubjectsUseCase {
    if (!this._enrollSubjectsUseCase) {
      this._enrollSubjectsUseCase = new EnrollSubjectsUseCase(
        this.config.database.pool,
        this.studentSubjectEnrollmentRepository
      );
    }
    return this._enrollSubjectsUseCase;
  }

  public get getEnrolledSubjectsUseCase(): GetEnrolledSubjectsUseCase {
    if (!this._getEnrolledSubjectsUseCase) {
      this._getEnrolledSubjectsUseCase = new GetEnrolledSubjectsUseCase(
        this.config.database.pool,
        this.studentSubjectEnrollmentRepository
      );
    }
    return this._getEnrolledSubjectsUseCase;
  }

  public get getSubjectLearningContentUseCase(): GetSubjectLearningContentUseCase {
    if (!this._getSubjectLearningContentUseCase) {
      this._getSubjectLearningContentUseCase = new GetSubjectLearningContentUseCase(
        this.config.database.pool,
        this.studentSubjectEnrollmentRepository
      );
    }
    return this._getSubjectLearningContentUseCase;
  }

  // Use Case getters - Play Session
  public get getSessionBySubjectUseCase(): GetSessionBySubjectUseCase {
    if (!this._getSessionBySubjectUseCase) {
      this._getSessionBySubjectUseCase = new GetSessionBySubjectUseCase(
        this.workflowSessionRepository,
        this.studentSubjectEnrollmentRepository
      );
    }
    return this._getSessionBySubjectUseCase;
  }

  public get getSessionContentBlocksUseCase(): GetSessionContentBlocksUseCase {
    if (!this._getSessionContentBlocksUseCase) {
      this._getSessionContentBlocksUseCase = new GetSessionContentBlocksUseCase(
        this.workflowSessionRepository
      );
    }
    return this._getSessionContentBlocksUseCase;
  }

  public get getUserProgressUseCase(): GetUserProgressUseCase {
    if (!this._getUserProgressUseCase) {
      this._getUserProgressUseCase = new GetUserProgressUseCase(
        this.workflowSessionRepository,
        this.config.database.pool
      );
    }
    return this._getUserProgressUseCase;
  }

  public get getBulkUserProgressUseCase(): GetBulkUserProgressUseCase {
    if (!this._getBulkUserProgressUseCase) {
      this._getBulkUserProgressUseCase = new GetBulkUserProgressUseCase(
        this.workflowSessionRepository,
        this.studentSubjectEnrollmentRepository,
        this.config.database.pool
      );
    }
    return this._getBulkUserProgressUseCase;
  }

  public get updateSessionProgressUseCase(): UpdateSessionProgressUseCase {
    if (!this._updateSessionProgressUseCase) {
      this._updateSessionProgressUseCase = new UpdateSessionProgressUseCase(
        this.workflowSessionRepository,
        this.studentSubjectEnrollmentRepository,
        this.config.database.pool
      );
    }
    return this._updateSessionProgressUseCase;
  }

  public get getSessionCommentsUseCase(): GetSessionCommentsUseCase {
    if (!this._getSessionCommentsUseCase) {
      this._getSessionCommentsUseCase = new GetSessionCommentsUseCase(
        this.workflowSessionRepository
      );
    }
    return this._getSessionCommentsUseCase;
  }

  public get createSessionCommentUseCase(): CreateSessionCommentUseCase {
    if (!this._createSessionCommentUseCase) {
      this._createSessionCommentUseCase = new CreateSessionCommentUseCase(
        this.workflowSessionRepository
      );
    }
    return this._createSessionCommentUseCase;
  }

  public get getQuizQuestionsUseCase(): GetQuizQuestionsUseCase {
    if (!this._getQuizQuestionsUseCase) {
      this._getQuizQuestionsUseCase = new GetQuizQuestionsUseCase(
        this.workflowSessionRepository
      );
    }
    return this._getQuizQuestionsUseCase;
  }

  public get submitQuizAttemptUseCase(): SubmitQuizAttemptUseCase {
    if (!this._submitQuizAttemptUseCase) {
      this._submitQuizAttemptUseCase = new SubmitQuizAttemptUseCase(
        this.workflowSessionRepository
      );
    }
    return this._submitQuizAttemptUseCase;
  }

  public get mapSubjectToSessionUseCase(): MapSubjectToSessionUseCase {
    if (!this._mapSubjectToSessionUseCase) {
      this._mapSubjectToSessionUseCase = new MapSubjectToSessionUseCase(
        this.workflowSessionRepository,
        this.config.database.pool
      );
    }
    return this._mapSubjectToSessionUseCase;
  }

  public get getCourseStructureUseCase(): GetCourseStructureUseCase {
    if (!this._getCourseStructureUseCase) {
      this._getCourseStructureUseCase = new GetCourseStructureUseCase(
        this.config.database.pool,
        this.studentSubjectEnrollmentRepository
      );
    }
    return this._getCourseStructureUseCase;
  }

  public get submitAssignmentUseCase(): SubmitAssignmentUseCase {
    if (!this._submitAssignmentUseCase) {
      this._submitAssignmentUseCase = new SubmitAssignmentUseCase(
        this.workflowSessionRepository
      );
    }
    return this._submitAssignmentUseCase;
  }

  public get gradeAssignmentUseCase(): GradeAssignmentUseCase {
    if (!this._gradeAssignmentUseCase) {
      this._gradeAssignmentUseCase = new GradeAssignmentUseCase(
        this.workflowSessionRepository,
        this.config.database.pool
      );
    }
    return this._gradeAssignmentUseCase;
  }

  public get getAssignmentSubmissionStatusUseCase(): GetAssignmentSubmissionStatusUseCase {
    if (!this._getAssignmentSubmissionStatusUseCase) {
      this._getAssignmentSubmissionStatusUseCase = new GetAssignmentSubmissionStatusUseCase(
        this.workflowSessionRepository
      );
    }
    return this._getAssignmentSubmissionStatusUseCase;
  }

  public get getStaffAssignmentSubmissionsUseCase(): GetStaffAssignmentSubmissionsUseCase {
    if (!this._getStaffAssignmentSubmissionsUseCase) {
      this._getStaffAssignmentSubmissionsUseCase = new GetStaffAssignmentSubmissionsUseCase(
        this.workflowSessionRepository,
        this.config.database.pool
      );
    }
    return this._getStaffAssignmentSubmissionsUseCase;
  }

  // Controller getters
  public get authController(): AuthController {
    if (!this._authController) {
      this._authController = new AuthController(
        this.loginUserUseCase,
        this.refreshTokenUseCase
      );
    }
    return this._authController;
  }

  // public get userController(): UserController {
  //   if (!this._userController) {
  //     this._userController = new UserController(
  //       this.getUsersUseCase,
  //       this.getUserByIdUseCase,
  //       this.createUserUseCase,
  //       this.updateUserUseCase,
  //       this.deleteUserUseCase
  //     );
  //   }
  //   return this._userController;
  // }

  public get departmentController(): DepartmentController {
    if (!this._departmentController) {
      this._departmentController = new DepartmentController(
        this.createDepartmentUseCase,
        this.getDepartmentsUseCase
      );
    }
    return this._departmentController;
  }

  public get studentEnrollmentController(): StudentEnrollmentController {
    if (!this._studentEnrollmentController) {
      this._studentEnrollmentController = new StudentEnrollmentController(
        this.getCurrentSemesterUseCase,
        this.getAvailableSubjectsUseCase,
        this.enrollSubjectsUseCase,
        this.getEnrolledSubjectsUseCase,
        this.getSubjectLearningContentUseCase
      );
    }
    return this._studentEnrollmentController;
  }

  public get playSessionController(): PlaySessionController {
    if (!this._playSessionController) {
      this._playSessionController = new PlaySessionController(
        this.getSessionBySubjectUseCase,
        this.getSessionContentBlocksUseCase,
        this.getUserProgressUseCase,
        this.getBulkUserProgressUseCase,
        this.updateSessionProgressUseCase,
        this.getSessionCommentsUseCase,
        this.createSessionCommentUseCase,
        this.getQuizQuestionsUseCase,
        this.submitQuizAttemptUseCase,
        this.mapSubjectToSessionUseCase,
        this.getCourseStructureUseCase,
        this.submitAssignmentUseCase,
        this.gradeAssignmentUseCase,
        this.getAssignmentSubmissionStatusUseCase,
        this.getStaffAssignmentSubmissionsUseCase
      );
    }
    return this._playSessionController;
  }

  /**
   * Reset the container (useful for testing)
   */
  public static reset(): void {
    DIContainer.instance = undefined as any;
  }

  /**
   * Create a test container with mock dependencies
   */
  public static createTestContainer(mocks: {
    userRepository?: IUserRepository;
    departmentRepository?: IDepartmentRepository;
    passwordService?: IPasswordService;
    tokenService?: ITokenService;
  }): DIContainer {
    const mockConfig: DIContainerConfig = {
      database: { pool: {} as Pool },
      jwt: {
        secret: 'test-secret',
        refreshSecret: 'test-refresh-secret',
        expiresIn: '15m',
        refreshExpiresIn: '7d',
      },
    };

    const container = new DIContainer(mockConfig);

    // Override with mocks
    if (mocks.userRepository) {
      container._userRepository = mocks.userRepository;
    }
    if (mocks.departmentRepository) {
      container._departmentRepository = mocks.departmentRepository;
    }
    if (mocks.passwordService) {
      container._passwordService = mocks.passwordService;
    }
    if (mocks.tokenService) {
      container._tokenService = mocks.tokenService;
    }

    return container;
  }
}
