# Technical Specification Document: Prompt Management System

## 1. Overview
This document outlines the technical architecture and design specifications for the Prompt Management System. The system is designed to allow users to create, manage, and categorize various AI prompts using a modern full-stack architecture.

**Tech Stack:**
- **Frontend:** Vue 3 (Composition API), Pinia (State Management), Vue Router
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (via Mongoose ODM)
- **Infrastructure:** Docker, Docker Compose

---

## 2. API Specification
The backend provides a RESTful API for interacting with Prompts and Categories.

### 2.1 Authentication (Optional/Placeholder)
All protected routes require a Bearer Token in the `Authorization` header.

### 2.2 Prompts API
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/prompts` | `GET` | Retrieve all prompts | N/A | `Array<Prompt>` | 200, 500 |
| `/api/prompts` | `POST` | Create a new prompt | `{ title, content, categoryId }` | `Prompt` | 201, 400, 500 |
| `/api/prompts/:id` | `GET` | Retrieve a specific prompt | N/A | `Prompt` | 200, 404, 500 |
| `/api/prompts/:id` | `PUT` | Update an existing prompt | `{ title, content, categoryId }` | `Prompt` | 200, 400, 404, 500 |
| `/api/prompts/:id` | `DELETE` | Remove a prompt | N/A | `{ message: string }` | 200, 404, 500 |

### 2.3 Categories API
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/categories` | `GET` | Retrieve all categories | N/A | `Array<Category>` | 200, 500 |
| `/api/categories` | `POST` | Create a new category | `{ name, description }` | `Category` | 201, 400, 500 |
| `/api/categories/:id` | `GET` | Retrieve a category | N/A | `Category` | 200, 404, 500 |
| `/api/categories/:id` | `PUT` | Update a category | `{ name, description }` | `Category` | 200, 400, 404, 500 |
| `/api/categories/:id` | `DELETE` | Remove a category | N/A | `{ message: string }` | 200, 404, 500 |

---

## 3. Data Model (Mongoose Schemas)

### 3.1 Category Schema
```javascript
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 255
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
```

### 3.2 Prompt Schema
```javascript
const promptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
```

---

## 4. Frontend Architecture

### 4.1 Component Hierarchy
- `App.vue` (Root Component)
    - `Navbar.vue` (Navigation Links)
    - `MainView.vue` (Dynamic View Container)
        - **Prompt Management Views**
            - `PromptList.vue` (List View)
                - `PromptCard.vue` (Individual Item)
                - `SearchBar.vue` (Filter functionality)
            - `PromptDetail.vue` (Single View)
                - `PromptEditor.vue` (Form for Create/Edit)
        - **Category Management Views**
            - `CategoryList.vue` (Sidebar/List)
            - `CategoryForm.vue` (Add/Edit Category)

### 4.2 State Management (Pinia)
- `usePromptStore`: Manages the array of prompts, handles API calls for fetching, creating, updating, and deleting prompts.
- `useCategoryStore`: Manages the list of categories and current selection.
- `useUIStore`: Manages global UI states like loading indicators, error messages, and modal visibility.

### 4.3 Routing (Vue Router)
- `/` -> `PromptListView`
- `/prompt/:id` -> `PromptDetailView`
- `/category/:id` -> `CategoryView`
- `/settings` -> `SettingsView`

---

## 5. Testing Strategy (Strict TDD)

The project follows a Test-Driven Development (TDD) approach to ensure high code quality and prevent regressions.

### 5.1 Backend Testing
- **Unit Testing:** Using **Jest**.
    - Test Mongoose models for validation logic.
    - Test utility functions and middleware (e.g., error handlers).
- **Integration Testing:** Using **Supertest**.
    - Test RESTful endpoints in isolation by mocking the database or using a dedicated test database.
    - Validate successful CRUD operations and correct HTTP status codes.

### 5.2 Frontend Testing
- **Component Testing:** Using **Vitest** and **Vue Test Utils**.
    - Verify component rendering, prop passing, and event emission.
    - Mock Pinia stores to test component behavior in isolation.
- **End-to-End (E2E) Testing:** Using **Playwright**.
    - Test critical user flows (e.g., creating a category, then creating a prompt within that category, then verifying it appears in the list).
    - Ensure all routing and navigation work as expected.

---

## 6. Deployment Architecture

The application is containerized using Docker to ensure environment parity between development, staging, and production.

### 6.1 Dockerfile (Backend)
A multi-stage build is recommended for the backend to minimize image size.
```dockerfile
# Build Stage
FROM node:18-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:18-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### 6.2 Docker Compose (Development/Local Orchestration)
```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - MONGO_URI=mongodb://db:27117/promptdb
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3000/api

  db:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```
