# PromptHub

PromptHub is a modern, full-stack web application designed for managing AI prompts. It allows users to create, categorize, and store prompts for easy reuse.

## Features
- **Prompt Management**: CRUD operations for your favorite AI prompts.
- **Categorization**: Organize prompts into logical categories.
- **Search**: Quickly find prompts using search functionality.
- **Reusability**: Easy copy-to-clipboard for rapid prompt usage.

## Tech Stack
- **Frontend**: Vue 3 (Composition API), Pinia, Vue Router, Tailwind CSS, Vite.
- **Backend**: Node.js, Express.js, Mongoose (MongoDB ODM).
- **Database**: MongoDB.
- **Deployment**: Docker & Docker Compose.

## Getting Started

### Prerequisites
- [Docker](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (for local development)

### Running with Docker (Recommended)
The easiest way to start the application is using Docker Compose.

1. Clone this repository.
2. Open a terminal in the project root.
3. Run the following command:
   ```bash
   docker-compose up --build
   ```
4. Access the application at:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:3000](http://localhost:3000)

### Local Development

#### Backend
1. Navigate to the `server` directory.
2. Install dependencies: `npm install`
3. Create a `.env` file with the following credentials:
   ```env
   MONGO_USER=root
   MONGO_PASSWORD=12345Abcde
   ```
4. Start the server: `npm run dev`

#### Frontend
1. Navigate to the `client` directory.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Project Structure
- `/client`: Vue 3 frontend application.
- `/server`: Node.js backend API.
- `docker-compose.yml`: Orchestration for the entire stack.
- `SPECIFICATION.md`: Detailed technical design document.
