# SmartLeavePortal

A web-based leave management system built using Node.js, Express.js, MongoDB, and JavaScript.

## Features

- User registration and login
- Admin login
- Apply for leave with date validation
- View leave application status
- Admin can review, approve, or reject leave requests
- Leave balance management
- Session-based authentication

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express.js
- Database: MongoDB
- Authentication: bcryptjs and express-session

## Requirements

- Node.js and npm
- MongoDB Community Server

## Setup Instructions

1. Clone this repository:

   ```bash
   git clone https://github.com/kavibharathi-2006/leave-management-system.git
   ```

2. Open the project folder:

   ```bash
   cd leave-management-system
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file in the project root using `.env.example` as a reference.

5. Configure these environment variables in `.env`:

   - `PORT`
   - `MONGODB_URI`
   - `SESSION_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`

   Choose your own strong session secret and admin password. Do not upload `.env` to GitHub.

6. Start MongoDB on your computer.

7. Start the application using the start command defined in `package.json`.

8. Open `http://localhost:5050` in your browser.

## Security

Never commit real passwords, session secrets, or private environment files to GitHub.
