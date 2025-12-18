# Student - ACT API - Setup Guide

This guide will help you set up and run the Student - ACT backend API with your PostgreSQL database.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 12+ installed and running
- Git (optional)

### 1. Automatic Setup (Recommended)

```bash
# Navigate to the API directory
cd one_student_one-_treeAPI

# Run the automatic setup
npm run setup

# Setup the database
npm run setup:db

# Start the development server
npm run dev
```

### 2. Manual Setup

If you prefer to set up manually:

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Build the project
npm run build

# Create necessary directories
mkdir -p logs uploads
```

## 🗄️ Database Setup

### Option 1: Using the Setup Script (Recommended)

The setup script will automatically create the schema and insert seed data:

```bash
npm run setup:db
```

### Option 2: Manual Database Setup

1. **Create the database:**
```bash
createdb OnestdOneTreeDB
```

2. **Run the schema:**
```bash
psql -d OnestdOneTreeDB -f database/schema.sql
```

3. **Insert seed data:**
```bash
psql -d OnestdOneTreeDB -f database/seed.sql
```

### Database Configuration

Your database is already configured in the `.env` file:
- **Database**: OnestdOneTreeDB
- **User**: pearl
- **Password**: 1968
- **Host**: localhost
- **Port**: 5432

## 🔧 Environment Configuration

The `.env` file has been created with your database credentials. Key settings:

```env
# Database
DB_NAME=OnestdOneTreeDB
DB_USER=pearl
DB_PASSWORD=1968

# Server
PORT=3000
NODE_ENV=development

# JWT (Change these in production!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_one_student_one_tree_2024
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```
The server will start at `http://localhost:3000` with hot reload.

### Production Mode
```bash
npm run build
npm start
```

## 🧪 Testing the API

### Automated API Testing
Run the comprehensive test suite:
```bash
npm run test:api
```

This will test all endpoints and functionality automatically.

### Manual Testing

#### Health Check
```bash
curl http://localhost:3000/health
```

#### API Root
```bash
curl http://localhost:3000/api/v1
```

#### Login (Test with default admin)
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@system.edu",
    "password": "password123"
  }'
```

#### Test Dashboard (after login)
```bash
# Replace YOUR_TOKEN with the token from login response
curl -X GET http://localhost:3000/api/v1/dashboard/overview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 👤 Default Users

The seed data includes these test users:

### Admin
- **Email**: admin@system.edu
- **Password**: password123
- **Role**: admin

### Principal
- **Email**: principal@gvec.edu
- **Password**: password123
- **Role**: principal

### HOD
- **Email**: hod.cs@gvec.edu
- **Password**: password123
- **Role**: hod

### Staff
- **Email**: staff.kumar@gvec.edu
- **Password**: password123
- **Role**: staff

### Student
- **Email**: akash@student.gvec.edu
- **Password**: password123
- **Role**: student

> **⚠️ Important**: Change all default passwords in production!

## 📚 API Documentation

Once the server is running, API documentation is available at:
`http://localhost:3000/api/v1/docs`

## 🔗 Available Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update profile
- `POST /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/logout` - Logout

### User Management
- `GET /api/v1/users` - Get all users (with filtering)
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create new user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (admin only)
- `GET /api/v1/users/role/:role` - Get users by role
- `GET /api/v1/users/statistics` - Get user statistics

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🛡️ Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Security headers with Helmet
- Rate limiting (configurable)

## 📊 Database Schema

The database includes these main tables:
- `users` - User accounts with roles
- `colleges` - Educational institutions
- `departments` - College departments
- `trees` - Tree records for monitoring
- `tree_monitoring_records` - Growth tracking data
- `tree_photos` - Photo documentation
- `invitations` - User invitation system
- `registration_requests` - Self-registration requests
- `notifications` - System notifications

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Data repositories
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript types
├── utils/           # Utility functions
└── server.ts        # Main server file
```

## 🚨 Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Check database credentials in `.env`
3. Verify database exists: `psql -l | grep OnestdOneTreeDB`

### Port Already in Use
Change the port in `.env`:
```env
PORT=3001
```

### Permission Errors
Make sure the database user has proper permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE OnestdOneTreeDB TO pearl;
```

## 🌱 Next Steps

1. **Test the API** with the provided endpoints
2. **Integrate with your frontend** using the authentication system
3. **Customize the tree monitoring** features for your needs
4. **Set up email notifications** for invitations
5. **Configure file uploads** for tree photos
6. **Add more API endpoints** as needed

## 📞 Support

If you encounter any issues:
1. Check the logs in the `logs/` directory
2. Verify your database connection
3. Ensure all environment variables are set correctly
4. Check the API documentation at `/api/v1/docs`

---

**🌳 Student - ACT Initiative**  
*Building a greener future through technology*
