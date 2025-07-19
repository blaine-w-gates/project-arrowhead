# Project Arrowhead

A web application for habit formation and task management using brainstorming and prioritization techniques.

## Running End-to-End Tests

The E2E test suite uses a two-step, decoupled workflow:

**Step 1 (Manual):** In your first terminal, start the application server with the command:
```bash
python3 app.py
```

**Step 2 (Automated):** In a second terminal, run the entire test suite with the command:
```bash
npm test
```

The tests will run against the already-running server. Make sure the server is fully started and accessible at `http://127.0.0.1:5000` before running the tests.

## Development

This project uses:
- Python/Flask for the backend server
- Vanilla JavaScript for the frontend
- Puppeteer + Jest for end-to-end testing

## Project Structure

- `app.py` - Flask application server
- `index.html` - Main application entry point
- `brainstorm_step*.html` - Brainstorming journey pages
- `choose_step*.html` - Priority selection journey pages
- `TaskListPage.html` - Task management interface
- `tests/journeys.test.js` - End-to-end test suite
