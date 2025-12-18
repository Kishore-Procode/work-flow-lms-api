# Student-ACT LMS - Backend API

Backend API for the Student-ACT Learning Management System by R.M.K Engineering College. This Node.js/TypeScript application provides a comprehensive REST API for managing learning resources, user roles, college administration, and student engagement in educational activities.

## 🌟 Features

- **Multi-Role User Management**: Admin, Principal, HOD, Instructor, and Student roles
- **College & Department Management**: Hierarchical organization structure
- **Learning Resource Management**: Track course progress, assessments, and learning outcomes
- **Invitation System**: Email-based user onboarding
- **Registration Requests**: Self-registration with approval workflow
- **Progress Documentation**: Learning progress tracking with multimedia support
- **Dashboard Analytics**: Role-specific insights and statistics
- **Email Notifications**: Automated communication system
- **JWT Authentication**: Secure token-based authentication
- **PostgreSQL Database**: Robust relational data storage

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer
- **File Upload**: Multer
- **Validation**: Joi
- **Testing**: Jest
- **Documentation**: Swagger/OpenAPI

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- PostgreSQL 12 or higher

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd one_student_one-_treeAPI
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=one_student_one_tree
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here

# Email Configuration (optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb one_student_one_tree

# Run migrations (after building the project)
npm run build
npm run migrate
```

Or manually run the SQL files:

```bash
psql -d one_student_one_tree -f database/schema.sql
psql -d one_student_one_tree -f database/seed.sql
```

### 4. Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### 5. Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

## 📁 Project Structure

```
src/
├── config/          # Configuration files
│   ├── database.ts  # Database connection
│   └── environment.ts # Environment variables
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Data models/repositories
├── routes/          # API routes
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── server.ts        # Main server file

database/
├── schema.sql       # Database schema
├── seed.sql         # Initial data
└── migrate.sql      # Migration script
```

## 🔐 Authentication

The API uses JWT-based authentication with role-based access control:

- **Admin**: Full system access
- **Principal**: College-wide management
- **HOD**: Department-level management
- **Staff**: Class and student management
- **Student**: Personal tree monitoring

## 🌍 Multiple Frontend URL Support

The API supports multiple frontend applications through flexible CORS configuration:

### Environment Variables
```env
# Single frontend URL (backwards compatible)
FRONTEND_URL=http://localhost:5173

# Multiple frontend URLs (comma-separated)
FRONTEND_URLS=http://localhost:5173,http://localhost:3001,https://app.yourdomain.com

# Environment-specific URLs
FRONTEND_DEV_URL=http://localhost:5173
FRONTEND_STAGING_URL=https://staging.yourdomain.com
FRONTEND_PROD_URL=https://app.yourdomain.com
```

### Use Cases
- Multiple development environments
- Staging and production deployments
- Mobile and web applications
- Multiple subdomains or domains

For detailed configuration, see [MULTIPLE_FRONTEND_CONFIGURATION.md](./MULTIPLE_FRONTEND_CONFIGURATION.md)

## 📚 API Documentation

When running in development mode, API documentation is available at:
`http://localhost:3000/api/v1/docs`

## 🌱 Core Functionality

### User Management
- User registration and authentication
- Role-based access control
- Profile management
- Status tracking (active/inactive/pending)

### College Administration
- College registration and management
- Department structure
- Principal and HOD assignments
- Staff and student enrollment

### Tree Monitoring
- Tree assignment to students
- Progress tracking with measurements
- Photo documentation
- Health status monitoring
- Growth analytics

### Communication
- Email invitations for new users
- Registration request approvals
- Notification system
- Automated reminders

## 🔧 Configuration

Key configuration options in `.env`:

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)
- `DB_*`: Database connection settings
- `JWT_*`: Authentication settings
- `SMTP_*`: Email configuration
- `UPLOAD_*`: File upload settings

## 🧪 Testing

The project includes comprehensive testing:

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

## 📊 Database Schema

The database includes tables for:
- Users (with role-based attributes)
- Colleges and Departments
- Trees and Monitoring Records
- Invitations and Registration Requests
- Photos and Notifications

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

Ensure all production environment variables are set:
- Database credentials
- JWT secrets
- Email configuration
- File upload paths

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation

---

**Student - ACT Initiative**  
R.M.K Engineering College  
Environmental Conservation Through Technology
"# work-flow-lms-ui" 
"# work-flow-lms-api" 
