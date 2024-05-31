import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null); // For storing the selected PDF file
  const [question, setQuestion] = useState(''); // For storing the user's question
  const [answer, setAnswer] = useState(''); // For storing the answer from the backend
  const [documentId, setDocumentId] = useState(null); // For storing the document ID after upload
  const [step, setStep] = useState(1); // For keeping track of which step of the process we're in
  const [messages, setMessages] = useState([]); // For storing chat messages
  const [suggestions, setSuggestions] = useState([]); // For storing question suggestions

  // Predefined suggestions to help users ask questions
  const predefinedSuggestions = [
    "What is the summary of this document?",
    "What are the main points discussed?",
    "Can you provide an overview?",
    "What is the conclusion?",
    "Can you explain the key concepts?",
    "Give me bullet points for each section",
    "Are there any important dates or deadlines listed?",
    "Are there any references or citations to other works?",
    "What are the recommendations or action items mentioned?",
    "Are there any notable quotes or statements?"
  ];

  // This function is called when a file is selected
  const onFileChange = (event) => {
    setSelectedFile(event.target.files[0]); // Set the selected file to state
  };

  // This function is called when the user clicks the "Upload PDF" button
  const onFileUpload = () => {
    const formData = new FormData(); // Create a new FormData object to hold the file
    formData.append('file', selectedFile); // Append the selected file to the FormData

    // Send a POST request to the backend to upload the file
    axios.post('https://pdfify-qa-da9dc31d1a2d.herokuapp.com/upload/', formData)
      .then(response => {
        // If successful, store the document ID and show a success message
        setDocumentId(response.data.id);
        setMessages([...messages, { sender: 'system', text: 'File uploaded successfully' }]);
        setStep(3); // Move to the next step (asking questions)
      })
      .catch(error => {
        console.error("Error uploading file:", error.response ? error.response.data : error.message);
        setMessages([...messages, { sender: 'system', text: 'Error uploading file' }]);
      });
  };

  // This function is called when the user clicks the "Submit Question" button
  const onQuestionSubmit = () => {
    if (!question.trim()) return; // If the question is empty, do nothing

    const newMessages = [...messages, { sender: 'user', text: question }]; // Add the user's question to the chat
    setMessages(newMessages);

    // Send a POST request to the backend to get the answer
    axios.post('https://pdfify-qa-da9dc31d1a2d.herokuapp.com/ask/', {
      question: question,
      document_id: documentId
    })
      .then(response => {
        // If successful, store the answer and add it to the chat
        setAnswer(response.data.answer);
        setMessages([...newMessages, { sender: 'bot', text: response.data.answer }]);
        setStep(4); // Move to the next step (showing the answer)
      })
      .catch(error => {
        console.error("Error getting answer:", error.response ? error.response.data : error.message);
        setMessages([...newMessages, { sender: 'bot', text: 'Error getting answer' }]);
      });

    setQuestion(''); // Clear the question input
  };

  // This function is called when the user clicks the "Upload New PDF" button
  const handleNewPDF = () => {
    // Reset all states to start over
    setSelectedFile(null);
    setQuestion('');
    setAnswer('');
    setDocumentId(null);
    setMessages([]);
    setStep(1); // Go back to the first step (uploading a PDF)
  };

  // This function is called when the user clicks the "Ask Another Question" button
  const handleNewQuestion = () => {
    setQuestion('');
    setAnswer('');
    setStep(3); // Go back to the question-asking step
  };

  // This function is called when the user types a question
  const handleQuestionChange = (e) => {
    const input = e.target.value;
    setQuestion(input);

    if (input.length > 0) {
      // Filter suggestions based on the user's input
      const filteredSuggestions = predefinedSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(input.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  // This function is called when the user clicks a suggestion
  const handleSuggestionClick = (suggestion) => {
    setQuestion(suggestion); // Set the clicked suggestion as the question
    setSuggestions([]); // Clear the suggestions
  };

  return (
    <div className="App">
      {step === 1 && ( // Show this section if we're in step 1 (uploading a PDF)
        <div className="welcome-section">
          <h1>The answers to all your questions start with the click of a button</h1>
          <div className="upload-section">
            <input type="file" onChange={onFileChange} /> {/* File input for uploading a PDF */}
            <button className="upload-button" onClick={onFileUpload}>Upload PDF</button> {/* Button to upload the file */}
          </div>
        </div>
      )}
      {step >= 3 && ( // Show this section if we're in step 3 or later (asking questions and showing answers)
        <div className="chat-container">
          <div className="chat-messages">
            {messages.map((msg, index) => ( // Display all chat messages
              <div key={index} className={`chat-message ${msg.sender}`}>
                <p>{msg.text}</p>
              </div>
            ))}
          </div>
          {step === 3 && documentId && ( // Show the question input if we're in step 3 and have a document ID
            <div className="question-section">
              <input
                type="text"
                value={question}
                onChange={handleQuestionChange}
                placeholder="Ask a question about the PDF"
              />
              <button className="question-button" onClick={onQuestionSubmit}>Submit Question</button>
              {suggestions.length > 0 && ( // Show suggestions if there are any
                <ul className="suggestions-list">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} onClick={() => handleSuggestionClick(suggestion)}>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {step === 4 && ( // Show this section if we're in step 4 (showing the answer)
            <div className="answer-section">
              <div className="action-buttons">
                <button className="upload-button" onClick={handleNewPDF}>Upload New PDF</button>
                <button className="question-button" onClick={handleNewQuestion}>Ask Another Question</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
