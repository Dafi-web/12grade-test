# Ethiopian Grade 12 Entrance & Remedial Exams Platform

A web application for practicing Ethiopian Grade 12 entrance and remedial exams with detailed solutions. Built with Node.js, Express, MongoDB, and vanilla JavaScript.

## Features

- **Student Portal**: Take practice exams by selecting grade, exam type (Entrance/Remedial), year, stream (Natural/Social), and course
- **Real-time Solution Checking**: Check solutions immediately after answering
- **Exam Summary**: View detailed results with solutions for all questions
- **Admin Dashboard**: Create and manage exam questions with solutions
- **MongoDB Integration**: All data stored in MongoDB cloud database

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas account (connection string already configured)

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Application

1. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
.
├── server.js          # Express server setup
├── config.js          # MongoDB configuration
├── models/
│   └── Exam.js        # MongoDB schema for exams and questions
├── routes/
│   └── api.js         # API endpoints
├── index.html         # Frontend HTML
├── styles.css         # Frontend styles
├── main.js            # Frontend JavaScript (API integration)
└── package.json       # Dependencies

```

## API Endpoints

- `GET /api/exams` - Get all exams (with optional filters)
- `GET /api/exams/find/by-filters` - Find exam by filters
- `GET /api/courses` - Get unique courses for filters
- `GET /api/questions` - Get all questions (for admin)
- `POST /api/questions` - Create a new question
- `DELETE /api/questions/:questionId` - Delete a question

## Usage

### For Students:
1. Click "Take Exam" in the navigation
2. Select Exam Type (Entrance or Remedial)
3. Select Year (2015, 2016, 2017)
4. Select Stream (Natural or Social)
5. Select Course
6. Click "Start Exam"
7. Answer questions and use "Check Solution" to see explanations
8. Submit exam to see summary with all solutions

### For Admins:
1. Click "Admin" in the navigation
2. Fill in exam metadata (Type, Year, Stream, Course)
3. Enter question text, 4 choices (A-D), correct answer, and solution
4. Click "Save Question"
5. View all questions in the right panel

## MongoDB Connection

The application uses MongoDB Atlas. The connection string is configured in `config.js`.

## License

ISC
