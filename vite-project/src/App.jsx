import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";
import vapi from "./vapi";
import { v4 as uuidv4 } from "uuid";   //  for session tracking
function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [startingInterview, setStartingInterview] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  // store ONE stable listener reference
  const messageListenerRef = useRef(null);  //  unique session for each interview
  const sessionIdRef = useRef(null);
  // ================= FILE SELECT =================
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };
  // ================= START INTERVIEW =================
  const handleUpload = async () => {
    if (!file) return alert("Upload resume first");
    setUploading(true);
    const formData = new FormData();
    formData.append("resume", file);
    try {
      // 1️ Upload resume to backend
      const res = await axios.post(
        "http://localhost:5001/resume/upload",
        formData
      );

      const resumeText = res.data.text;
      console.log("Resume Parsed:", resumeText);

      //  Generate NEW session ID
      sessionIdRef.current = uuidv4();
      console.log("Interview Session:", sessionIdRef.current);

      setUploading(false);
      setStartingInterview(true);

      // 2️ Start VAPI Interview
      await vapi.start("9c7fc441-20a6-4bad-80aa-64551caf0799", {
        variableValues: {
          resume: resumeText,
        },
      });
      
      console.log("Interview Started");

      // 3️ Prevent duplicate listeners (React StrictMode fix)
      if (messageListenerRef.current) {
        vapi.removeListener("message", messageListenerRef.current);
      }

      // 4️ Listen to interview conversation
     messageListenerRef.current = async (msg) => {
  console.log("RAW VAPI MSG:", msg);

  // Only save FINAL spoken sentence
  if (msg.type !== "transcript" || msg.transcriptType !== "final") return;

  try {
    await axios.post("http://localhost:5001/conversation/save", {
      interviewId: sessionIdRef.current,
      role: msg.role,
      text: msg.transcript,
    });

    console.log("Saved to Firebase ✅");
  } catch (err) {
    console.error("Save failed:", err.response?.data || err.message);
  }
};


      // 5️ Attach listener
      vapi.on("message", messageListenerRef.current);

      setStartingInterview(false);
      setInterviewStarted(true);
    } catch (err) {
      console.error("Interview start failed:", err);
      setUploading(false);
      setStartingInterview(false);
      alert("Failed to start interview. Please try again.");
    }
  };

  // ================= STOP INTERVIEW =================
 const handleStopInterview = async () => {
  try {
    vapi.stop();
    console.log("Interview stopped");

    if (messageListenerRef.current) {
      vapi.removeListener("message", messageListenerRef.current);
      messageListenerRef.current = null;
    }

    setInterviewStarted(false);
    setGeneratingFeedback(true);
    setFeedback(null); // Clear previous feedback

    //  CALL BACKEND TO GENERATE FEEDBACK
    console.log("Generating feedback for:", sessionIdRef.current);

    const res = await axios.post("http://localhost:5001/feedback/generate", {
      interviewId: sessionIdRef.current,
    });

    console.log("AI Feedback:", res.data.feedback);
    setFeedback(res.data.feedback);
    setGeneratingFeedback(false);
  } catch (err) {
    console.error("Feedback generation failed:", err);
    setGeneratingFeedback(false);
    alert("Failed to generate feedback. Please try again.");
  }
};

  // ================= RESET =================
  const handleReset = () => {
    setFile(null);
    setInterviewStarted(false);
    setStartingInterview(false);
    setFeedback(null);
    setGeneratingFeedback(false);
    sessionIdRef.current = null;
  };


  // ================= CLEANUP =================
  useEffect(() => {
    return () => {
      if (messageListenerRef.current) {
        vapi.removeListener("message", messageListenerRef.current);
      }
    };
  }, []);

  // ================= UI =================
  return (
    <div className="app-container">
      <div className="app-content">
        <header className="app-header">
          <h1 className="app-title">🎤 AI Mock Interview</h1>
          <p className="app-subtitle">Practice your interview skills with AI-powered feedback</p>
        </header>

        {startingInterview && (
          <div className="interview-starting">
            <div className="spinner"></div>
            <h2>⏳ It will begin soon...</h2>
            <p>Preparing your interview session</p>
          </div>
        )}

        {!interviewStarted && !feedback && !startingInterview && (
          <div className="upload-section">
            <div className="file-upload-wrapper">
              <label htmlFor="resume-upload" className="file-upload-label">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5-5M12 3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Upload Your Resume</span>
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="file-input"
                />
              </label>
            </div>

            {file && (
              <div className="file-selected">
                <div className="file-info">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M14 2H6a2 2 0 0 0 2v20a2 2 0 0 0 2h12a2 2 0 0 0-2V2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2v6h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{file.name}</span>
                </div>
                <button 
                  onClick={handleUpload} 
                  disabled={uploading}
                  className="btn btn-primary"
                >
                  {uploading ? "⏳ Analyzing Resume..." : "🚀 Start Interview"}
                </button>
              </div>
            )}
          </div>
        )}

        {interviewStarted && (
          <div className="interview-section">
            <div className="interview-status">
              <div className="pulse-dot"></div>
              <h2>Interview In Progress 🎙️</h2>
              <p>The AI interviewer is asking questions based on your resume.</p>
            </div>
            <button
              onClick={handleStopInterview}
              className="btn btn-danger"
            >
              ⏹ Stop Interview
            </button>
          </div>
        )}

        {generatingFeedback && (
          <div className="feedback-loading">
            <div className="spinner"></div>
            <h2>Generating Your Feedback Report...</h2>
            <p>This may take a few moments</p>
          </div>
        )}

        {feedback && (
          <div className="feedback-section">
            <div className="feedback-header">
              <h2>📊 Your Interview Feedback Report</h2>
              <button onClick={handleReset} className="btn btn-secondary">
                🔄 Start New Interview
              </button>
            </div>
            <div className="feedback-content">
              <div className="feedback-text">
                {feedback.split('\n').map((line, idx) => {
                  const trimmedLine = line.trim();
                  
                  if (!trimmedLine) {
                    return <br key={idx} />;
                  }
                  
                  if (trimmedLine.match(/^Overall Score:/i)) {
                    return (
                      <div key={idx} className="score-line">
                        <strong>{trimmedLine}</strong>
                      </div>
                    );
                  }
                  
                  if (trimmedLine.match(/^(Strengths|Weaknesses|Communication Skills|Technical Understanding|Final Recommendation):/i)) {
                    return (
                      <h3 key={idx} className="section-title">
                        {trimmedLine}
                      </h3>
                    );
                  }
                  
                  if (trimmedLine.startsWith('-')) {
                    return (
                      <div key={idx} className="bullet-point">
                        {trimmedLine.substring(1).trim()}
                      </div>
                    );
                  }
                  
                  return (
                    <p key={idx}>{trimmedLine}</p>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default App;