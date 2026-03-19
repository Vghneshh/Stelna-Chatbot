// Test script to manually mark a session as completed
// Run this from browser console to simulate PRC completion

// Simulate what happens when PRC completes
const sessionId = "test-session-ui"; // Use any session ID

// Send a test message to trigger the completion check
fetch("http://localhost:5000/chat", {
  method: "POST", 
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "check product readiness",
    sessionId: sessionId
  })
})
.then(res => res.json())
.then(data => {
  console.log("1. Started PRC:", data);
  
  // Now simulate marking as completed (this would normally happen after 28 questions)
  // We'll use a direct backend call to mark completed
  return fetch("http://localhost:5000/test-mark-completed", {
    method: "POST",
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify({ sessionId: sessionId })
  });
})
.then(res => res.json())
.then(() => {
  console.log("2. Marked session as completed");
  
  // Now test the blocking - send any message
  return fetch("http://localhost:5000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      message: "hello", 
      sessionId: sessionId 
    })
  });
})
.then(res => res.json())
.then(data => {
  console.log("3. Blocked response:", data.reply);
})
.catch(err => console.error("Test failed:", err));
