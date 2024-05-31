#imports start here
#FastAPI was used for creating the API, SQLAlchemy was used for the database, PyMuPDF was used for handling the docs, and LangChain for used for processing questions and answers.
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware #CORS middleware to allow cross-origin requests since I'm hosting the frontend and backend on diff domains 
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import fitz # from PyMuPDF to work with PDFs
import os
from datetime import datetime
import shutil
from langchain.chains.question_answering import load_qa_chain
from langchain.docstore.document import Document
import logging
import openai
from langchain_community.llms import OpenAI
#imports end here

# Initialize FastAPI app
app = FastAPI()

# Endpoint to verify if the backend server is running or not 
@app.get("/")
def read_root():
    return {"message": "It's working"}

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

#Adding cors middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allowing all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup where we use sqlite for the database
DATABASE_URL = "sqlite:///./test.db"
Base = declarative_base()
engine = create_engine(DATABASE_URL) # Creating a database engine
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) #session maker
#model fo metadata storage
class DocumentMetadata(Base):
    __tablename__ = "documents"  # Name of the table
    id = Column(Integer, primary_key=True, index=True)  # ID column (primary key)
    filename = Column(String, index=True)  # Filename column
    upload_date = Column(DateTime, default=datetime.utcnow)  # Upload date column (default to current time)


Base.metadata.create_all(bind=engine)

# File storage setup
UPLOAD_FOLDER = "./uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# LangChain setup
api_key = os.getenv("OPENAI_API_KEY")
llm = OpenAI(api_key=api_key)  #Initialize OpenAI with the API key. Since i'm using Heroku for the backend, I stored the API key in the Heroku config vars
#There was a default key here as well, however, I have removed it for security reasons
qa_chain = load_qa_chain(llm)

# PDF Upload endpoint
@app.post("/upload/")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Invalid file type") # Raising error if file is not a PDF
        
        file_location = f"{UPLOAD_FOLDER}/{file.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        # PyMuPDF for extracting text from PDF
        doc = fitz.open(file_location)
        text = ""
        for page in doc:
            text += page.get_text()
        
        # Save document metadata to the database
        db = SessionLocal()
        doc_entry = DocumentMetadata(filename=file.filename)
        db.add(doc_entry)
        db.commit()
        db.refresh(doc_entry)
        
        logger.info(f"Uploaded PDF: {file.filename}, Extracted text length: {len(text)}")
        # Return response for debugging purposes
        return JSONResponse(status_code=200, content={"id": doc_entry.id, "filename": file.filename, "text": text})
    except Exception as e:
        logger.error(f"Error uploading PDF: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

# Question endpoint
class Question(BaseModel):
    question: str
    document_id: int # The ID of the document to ask the question about

@app.post("/ask/")
async def ask_question(question: Question):
    try:
        db = SessionLocal()
        document = db.query(DocumentMetadata).filter(DocumentMetadata.id == question.document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found") # If the document is not found, raise an error (doc not found)
        
        file_location = f"{UPLOAD_FOLDER}/{document.filename}"
        doc = fitz.open(file_location)
        text = ""
        for page in doc:
            text += page.get_text()

        logger.info(f"Processing question: {question.question} for document: {document.filename}")
        
        # Convert the extracted text to LangChain Document format
        langchain_document = Document(page_content=text, metadata={"source": file_location})
        
        # Process question with LangChain using invoke method
        response = qa_chain.invoke({"input_documents": [langchain_document], "question": question.question})
        answer_text = response["output_text"]
        
        logger.info(f"Generated answer: {answer_text}")
        # Return answer in JSON response
        return JSONResponse(status_code=200, content={"answer": answer_text})
    except Exception as e:
        logger.error(f"Error processing question: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
