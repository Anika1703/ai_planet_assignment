App is the backend folder, whilst My-app is the frontend folder. 
Backend: FastAPI
NLP Processing: LangChain/LLamaIndex
Frontend: React.js
Database: SQLite (for storing document metadata)
File Storage: Local filesystem (for storing uploaded PDFs)


Installation and set up 
Backend Setup: Clone the repo, create a virtual environment and activate it, and install dependencies using pip install -r requirements.txt
Set up the database and start the FastAPI server using uvicorn main:app --reload
Frontend setup: install dependencies using npm install and start the react server
The frontend is deployed on Netlify whilst the backend is deployed on Heroku. 
