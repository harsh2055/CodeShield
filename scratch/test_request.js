const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: '.env' });

const User = require('../database/models/User');

async function testRequest() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const user = await User.findOne();
  if (!user) {
    console.log("No user found. Exiting.");
    process.exit(1);
  }
  
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  
  try {
    const res = await fetch('http://localhost:5000/api/explain', {
      method: 'POST',
      body: JSON.stringify({
        code: "print('hello')",
        language: "python",
        level: "beginner"
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    const text = await res.text();
    console.log("Success! Status:", res.status);
    console.log("Data:", text);
  } catch (err) {
    console.error("Error:", err);
  }
  
  mongoose.disconnect();
}

testRequest();
