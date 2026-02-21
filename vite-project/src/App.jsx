import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";
import vapi from "./vapi";
import { v4 as uuidv4 } from "uuid";

//  API Configuration
const RENDER_URL = "https://ai-interview-5-j4xl.onrender.com";

axios.defaults.baseURL = undefined;
axios.defaults.headers.common = {};
axios.defaults.headers.post = {};

const api = axios.create({
  baseURL: RENDER_URL,
  timeout: 30000,
});

api.interceptors.request.use(request => {
  console.log(' Request:', request.baseURL + request.url);
  return request;
});

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preparingInterview, setPreparingInterview] = useState(false);
  const messageListenerRef = useRef(null);
  const sessionIdRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type.includes('pdf') || 
        droppedFile.type.includes('doc') || 
        droppedFile.type.includes('docx'))) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Please upload a valid PDF, DOC, or DOCX file");
    }
  };
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError(null);
  };
  
  const handleUpload = async () => {
    if (!file) {
      setError("Please upload your resume first");
      return;
    }
    
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("resume", file);
    
    try {
      console.log(" Uploading to:", `${RENDER_URL}/resume/upload`);
      
      const res = await api.post("/resume/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      const resumeText = res.data.text;
      console.log(" Resume Parsed:", resumeText);

      sessionIdRef.current = uuidv4();
      console.log(" Session:", sessionIdRef.current);

      setPreparingInterview(true);
      
      // Small delay to show preparing state
      setTimeout(async () => {
        try {
          await vapi.start("9c7fc441-20a6-4bad-80aa-64551caf0799", {
            variableValues: {
              resume: resumeText,
            },
          });
          
          console.log("🎙️ Interview Started");

          if (messageListenerRef.current) {
            vapi.removeListener("message", messageListenerRef.current);
          }

          messageListenerRef.current = async (msg) => {
            if (msg.type !== "transcript" || msg.transcriptType !== "final") return;

            try {
              await api.post("/conversation/save", {
                interviewId: sessionIdRef.current,
                role: msg.role,
                text: msg.transcript,
              });
              console.log(" Saved");
            } catch (err) {
              console.error(" Save failed:", err);
            }
          };

          vapi.on("message", messageListenerRef.current);
          setInterviewStarted(true);
          setPreparingInterview(false);
        } catch (err) {
          console.error(" Failed to start interview:", err);
          setError("Failed to start interview. Please try again.");
          setPreparingInterview(false);
        }
      }, 2000);
      
    } catch (err) {
      console.error(" Failed:", err);
      setError(`Upload failed: ${err.message}`);
      setUploading(false);
    }
  };
  
  const handleStopInterview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      vapi.stop();
      console.log(" Stopped");

      if (messageListenerRef.current) {
        vapi.removeListener("message", messageListenerRef.current);
        messageListenerRef.current = null;
      }

      console.log(" Sending feedback request for session:", sessionIdRef.current);
      
      const res = await api.post("/feedback/generate", {
        interviewId: sessionIdRef.current,
      });

      console.log("📊 Feedback Data:", res.data);
      
      if (res.data && res.data.feedback) {
        setFeedback(res.data.feedback);
      } else if (res.data && typeof res.data === 'string') {
        setFeedback(res.data);
      } else {
        console.error(" Unexpected response format:", res.data);
        setError("Unexpected response format from server");
      }
      
      setInterviewStarted(false);
      
    } catch (err) {
      console.error(" Feedback failed:", err);
      setError(err.response?.data?.error || "Failed to generate feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const resetInterview = () => {
    setFile(null);
    setFeedback(null);
    setError(null);
    sessionIdRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  useEffect(() => {
    return () => {
      if (messageListenerRef.current) {
        vapi.removeListener("message", messageListenerRef.current);
      }
    };
  }, []);

  const renderFeedback = () => {
    if (!feedback) return null;
    
    if (typeof feedback !== 'string') {
      return <div className="error-message">Invalid feedback format</div>;
    }
    
    const sections = feedback.split('\n\n');
    
    return (
      <div className="feedback-container">
        {sections.map((section, index) => {
          if (section.includes('Overall Score:')) {
            const score = section.split('Overall Score:')[1]?.trim() || 'N/A';
            return (
              <div key={index} className="score-section">
                <h3>Overall Score</h3>
                <div className="score-badge">{score}</div>
              </div>
            );
          }
          else if (section.includes('Strengths:')) {
            return (
              <div key={index} className="strengths-section">
                <h3>💪 Strengths</h3>
                <ul>
                  {section.split('\n').slice(1).map((item, i) => (
                    item.trim() && <li key={i}>{item.replace('-', '').trim()}</li>
                  ))}
                </ul>
              </div>
            );
          }
          else if (section.includes('Weaknesses:')) {
            return (
              <div key={index} className="weaknesses-section">
                <h3>📉 Areas for Improvement</h3>
                <ul>
                  {section.split('\n').slice(1).map((item, i) => (
                    item.trim() && <li key={i}>{item.replace('-', '').trim()}</li>
                  ))}
                </ul>
              </div>
            );
          }
          else if (section.includes('Communication Skills:')) {
            const text = section.split('Communication Skills:')[1]?.trim() || '';
            return (
              <div key={index} className="communication-section">
                <h3>🗣️ Communication Skills</h3>
                <p>{text}</p>
              </div>
            );
          }
          else if (section.includes('Technical Understanding:')) {
            const text = section.split('Technical Understanding:')[1]?.trim() || '';
            return (
              <div key={index} className="technical-section">
                <h3>💻 Technical Understanding</h3>
                <p>{text}</p>
              </div>
            );
          }
          else if (section.includes('Final Recommendation:')) {
            const recommendation = section.split('Final Recommendation:')[1]?.trim() || '';
            let recClass = 'recommendation-neutral';
            if (recommendation.includes('Hire')) recClass = 'recommendation-hire';
            if (recommendation.includes('No Hire')) recClass = 'recommendation-nohire';
            
            return (
              <div key={index} className={`recommendation-section ${recClass}`}>
                <h3>🎯 Final Recommendation</h3>
                <div className="recommendation-badge">{recommendation}</div>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="app">
      {/* Animated Background */}
      <div className="gradient-bg">
        <div className="gradient-1"></div>
        <div className="gradient-2"></div>
        <div className="gradient-3"></div>
      </div>

      {/* Floating Particles */}
      <div className="particles">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>

      <div className="content">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <span className="logo-icon">🎯</span>
            <h1>Mock<span>Interview</span></h1>
          </div>
          <p className="tagline">Practice with AI • Get Instant Feedback • Ace Your Interview</p>
        </header>

        {/* Main Content */}
        <main className="main">
          {error && (
            <div className="error-toast">
              <span>❌ {error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {!interviewStarted && !feedback && (
            <div className="upload-container">
              <div className="upload-card">
                <div className="upload-icon">📄</div>
                <h2>Ready to Practice?</h2>
                <p className="upload-subtitle">Upload your resume and start your mock interview</p>
                
                <div 
                  className={`drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden-input"
                  />
                  
                  {!file ? (
                    <>
                      <div className="cloud-icon">☁️</div>
                      <div className="drop-text">
                        <span className="primary-text">Click to upload</span>
                        <span className="secondary-text">or drag and drop</span>
                      </div>
                      <div className="file-types">PDF, DOC, DOCX (Max 10MB)</div>
                    </>
                  ) : (
                    <div className="file-preview">
                      <div className="file-icon">📎</div>
                      <div className="file-details">
                        <div className="file-name">{file.name}</div>
                        <div className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                      <button 
                        className="remove-file"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleUpload} 
                  disabled={uploading || preparingInterview || !file}
                  className={`start-button ${(!file || uploading || preparingInterview) ? 'disabled' : ''}`}
                >
                  {uploading ? (
                    <>
                      <span className="spinner"></span>
                      Analyzing Resume...
                    </>
                  ) : preparingInterview ? (
                    <>
                      <span className="spinner"></span>
                      Preparing Interview...
                    </>
                  ) : (
                    <>
                      <span>🎤</span>
                      Start Interview
                    </>
                  )}
                </button>

                <div className="feature-list">
                  <div className="feature-item">
                    <span>✓</span> AI-powered questions
                  </div>
                  <div className="feature-item">
                    <span>✓</span> Real-time conversation
                  </div>
                  <div className="feature-item">
                    <span>✓</span> Detailed feedback
                  </div>
                </div>
              </div>
            </div>
          )}

          {preparingInterview && !interviewStarted && (
            <div className="preparing-overlay">
              <div className="preparing-card">
                <div className="preparing-spinner"></div>
                <h3>Preparing Your Interview</h3>
                <p>Analyzing resume and setting up AI interviewer...</p>
                <div className="preparing-steps">
                  <div className="step done">📄 Resume analyzed</div>
                  <div className="step active">🤖 Setting up AI</div>
                  <div className="step">🎙️ Starting interview</div>
                </div>
              </div>
            </div>
          )}

          {interviewStarted && (
            <div className="interview-container">
              <div className="interview-card">
                <div className="interview-header">
                  <div className="status-badge">
                    <span className="live-dot"></span>
                    LIVE INTERVIEW
                  </div>
                  <div className="session-info">
                    Session: {sessionIdRef.current?.slice(0,8)}...
                  </div>
                </div>
                
                <div className="interview-visual">
                  <div className="ai-avatar">
                    <div className="avatar-ring"></div>
                    <div className="avatar-content">🤖</div>
                  </div>
                  
                  <div className="wave-group">
                    <div className="wave wave1"></div>
                    <div className="wave wave2"></div>
                    <div className="wave wave3"></div>
                  </div>
                  
                  <div className="listening-indicator">
                    <span>AI is listening</span>
                    <div className="dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>

                <div className="interview-message-box">
                  <p>AI is asking questions based on your resume. Speak clearly and take your time.</p>
                </div>

                <button
                  onClick={handleStopInterview}
                  disabled={loading}
                  className="stop-interview-btn"
                >
                  {loading ? (
                    <>
                      <span className="spinner-small"></span>
                      Generating Feedback...
                    </>
                  ) : (
                    <>
                      <span>⏹️</span>
                      End Interview & Get Feedback
                    </>
                  )}
                </button>

                <div className="interview-tips">
                  <h4>💡 Tips</h4>
                  <ul>
                    <li>Speak clearly and at a moderate pace</li>
                    <li>Take your time to think before answering</li>
                    <li>Provide specific examples from your experience</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {feedback && (
            <div className="feedback-container-wrapper">
              <div className="feedback-header">
                <h2>Your Interview Feedback</h2>
                <button onClick={resetInterview} className="new-interview-btn">
                  <span>↻</span>
                  New Interview
                </button>
              </div>
              
              {renderFeedback()}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
