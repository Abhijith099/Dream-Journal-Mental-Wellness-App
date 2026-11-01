const fetch = require('node-fetch'); // we'll try without require if it fails

async function testSubmit() {
  const payload = {
    title: "End to End Auto-Approve Test",
    body: "This is an automated test story to ensure the auto-approve temporary change allows the story to immediately enter the feed.",
    isAnonymous: true,
    overcame: true,
    overcomeDetail: "Testing end to end.",
    consentGiven: true
  };
  
  try {
    // 1. Submit the story
    const res = await fetch('http://localhost:5000/api/wellness/peer-stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-123'
      },
      body: JSON.stringify(payload)
    });
    
    console.log("POST status:", res.status);
    const data = await res.json();
    console.log("POST response:", data);
    
    // 2. Query the feed to see if it shows up immediately
    const getRes = await fetch('http://localhost:5000/api/peer-stories');
    const feed = await getRes.json();
    console.log("Feed stories count:", feed.length);
    const found = feed.find(s => s.title === "End to End Auto-Approve Test");
    
    if (found) {
       console.log("SUCCESS: Story appeared in feed immediately.");
       console.log("Story ID:", found._id);
    } else {
       console.log("FAILURE: Story did not appear in feed.");
    }
    
  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

testSubmit();
