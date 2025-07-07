# Umpiluzi Fire Protection Association - Fire Permit System

## Overview

This repository contains a web application for the Umpiluzi Fire Protection Association that helps users apply for fire permits, learn about fire safety, and access resources related to wildfire prevention. The application follows a full-stack architecture with a React frontend and Express backend, using Drizzle ORM for database operations, and is styled with Tailwind CSS and the shadcn/ui component library.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and uses a component-based architecture with the following key features:

1. **UI Component Library**: Uses shadcn/ui components built on top of Radix UI primitives for accessible, customizable UI elements
2. **Styling**: Tailwind CSS with a custom theme focused on fire-related colors (reds and oranges)
3. **State Management**: React Query for server state management and React hooks for local state
4. **Routing**: Uses Wouter for lightweight client-side routing
5. **API Communication**: Custom fetch-based API client in the form of React Query hooks

### Backend Architecture

The backend is built with Express.js and follows a modular architecture:

1. **Server Setup**: Main Express application with middleware for parsing JSON and URL-encoded data
2. **API Routes**: RESTful API routes prefixed with `/api`
3. **Database**: Uses Drizzle ORM for database operations
4. **Storage Interface**: Abstraction layer for database operations with both in-memory implementation and planned database implementation

### Data Storage

The application is designed to use PostgreSQL with Drizzle ORM for data storage:

1. **Schema**: User schema defined in `shared/schema.ts` using Drizzle's type-safe schema definitions
2. **ORM**: Drizzle ORM for type-safe database operations
3. **Database Provisioning**: Currently configured with environment variables for database connection

## Key Components

### Frontend Components

1. **Page Components**: 
   - Home - Main landing page with multiple sections
   - NotFound - 404 page

2. **UI Components**:
   - Header - Navigation and branding
   - Hero - Main call-to-action section
   - About - Information about the organization
   - PermitsInfo - Details about fire permits
   - CallToAction - Prominent application button
   - FireSafety - Resources about fire safety
   - Contact - Contact form and information
   - Footer - Site navigation and additional links

3. **UI Library**:
   - Comprehensive set of UI components from shadcn/ui
   - Custom theme with fire-themed colors

### Backend Components

1. **Server**: Express application with middleware and route registration
2. **Routes**: API route definitions in `server/routes.ts`
3. **Storage**: Interface for user data operations in `server/storage.ts`
   - Currently implemented with an in-memory storage
   - Designed to be replaced with a PostgreSQL implementation

### Shared Components

1. **Schema**: Database schema definitions shared between frontend and backend
2. **Types**: TypeScript types for data models

## Data Flow

1. **User Authentication Flow**:
   - User registration and login through the API
   - Backend validates credentials and issues session
   - Frontend stores authentication state using React Query

2. **Fire Permit Application Flow**:
   - User fills out permit application form
   - Form submission sends data to backend API
   - Backend validates and stores application data
   - User receives confirmation and permit status

3. **Data Retrieval Flow**:
   - Frontend requests data from backend API using React Query
   - Backend retrieves data from storage layer
   - Data is returned to frontend for display

## External Dependencies

### Frontend Dependencies

1. **UI Framework**: React with shadcn/ui components built on Radix UI primitives
2. **Styling**: Tailwind CSS with custom theme
3. **Routing**: Wouter for client-side routing
4. **Data Fetching**: React Query for server state management
5. **Form Handling**: React Hook Form with Zod validation

### Backend Dependencies

1. **Server Framework**: Express.js
2. **Database ORM**: Drizzle ORM
3. **Database**: PostgreSQL (through Neon Database serverless driver)
4. **Type Safety**: TypeScript and Zod for validation

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:

1. **Development Environment**:
   - `npm run dev` - Starts the development server
   - Uses Vite for frontend development and tsx for TypeScript execution

2. **Production Build**:
   - `npm run build` - Builds the frontend with Vite and bundles the backend with esbuild
   - `npm run start` - Starts the production server from the bundled output

3. **Database Management**:
   - `npm run db:push` - Updates the database schema using Drizzle Kit

4. **Environment Configuration**:
   - Uses environment variables for database connection
   - Configured to work with Replit's PostgreSQL module

The `.replit` file configures the project to run in the Replit environment with appropriate modules (Node.js, web, and PostgreSQL) and sets up the deployment configuration.

## Getting Started

1. Ensure the PostgreSQL database is provisioned in Replit
2. Set the `DATABASE_URL` environment variable
3. Run `npm install` to install dependencies
4. Run `npm run db:push` to initialize the database schema
5. Run `npm run dev` to start the development server
6. Access the application at the provided URL

## Recent Changes

### Document Management System (July 2025)
- **Added comprehensive document management** with admin upload functionality and member download access
- **Created document schema** with support for title, description, file metadata, visibility controls, and download tracking
- **Implemented Firebase document service** with full CRUD operations and public/private document filtering
- **Added document API endpoints** with proper authentication, role-based access control, and download tracking
- **Created admin document management tab** with upload forms, file validation, visibility controls, and document editing
- **Added public documents section** to home page for member access with download functionality and authentication checks
- **Enhanced admin panel** with dedicated Documents tab for file upload, metadata management, and visibility controls

### Compartment API Enhancement (July 2025)
- **Added compartment field support** to the Fire Permit API and documentation
- **Enhanced API filtering** with compartment parameter for all permit endpoints  
- **Updated comprehensive documentation** including response structure examples
- **Implemented compartment filtering** in Firebase service with case-insensitive search
- **Enhanced API documentation** with interactive testing capabilities for compartment filtering

### Comprehensive API Response Documentation (July 2025)
- **Added detailed response examples** for all API endpoints in both web and markdown documentation
- **Enhanced response structure documentation** with complete field descriptions for all data models
- **Updated Areas API documentation** with full object structure and example responses
- **Updated Burn Types API documentation** with comprehensive field explanations and examples
- **Updated User Profile API documentation** with complete authentication and profile response examples
- **Added Health Check API documentation** with example responses

The document management system allows administrators to upload and manage documents that can be made available to all members for download. The system includes proper file metadata tracking, download counts, and visibility controls.

## API Documentation Updates

The API now fully supports compartment filtering through:
- Query parameter: `compartment` - Filter by compartment number or section identifier
- Response field: `compartment` - Compartment number or section within the farm/area
- Interactive testing buttons in the web documentation
- Comprehensive examples in both web and markdown documentation

## Next Steps for Development

1. Implement the API routes for user registration and authentication
2. Implement the fire permit application form and submission logic
3. Create the fire permit management dashboard for administrators
4. Set up email notifications for permit status updates
5. Implement role-based access control for different user types