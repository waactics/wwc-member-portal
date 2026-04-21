const express = require('express');
const app = express();
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const User = require('./Models/User');
const jwt = require('jsonwebtoken');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
app.use(cors());

/* google id + mondodb id */
app.post('/auth/google', async (req, res) => {
    //set CORS headers
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Origin', 'https://wwc-member-portal.vercel.app');
  
    try {
      const { token } = req.body;
      console.log("token received:", token ? "✅ (exists)" : "❌ (missing)");

      if (!token) {
        console.log("❌ no token provided");
        return res.status(400).json({ message: "token is required!" });
      }

      //verify google token
      console.log("verifying token with google...");
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      console.log("🎉 google verification success! payload:", {
        name: payload.name,
        email: payload.email,
        googleId: payload.sub
      });
  
      //check if user exists in mongoDB
      let user = await User.findOneAndUpdate(
        { googleId: payload.sub },
        {
            $setOnInsert: {
                name: payload.name,
                gmail: payload.email,
                googleId: payload.sub,
                email: undefined
            }
        },
        {
            upsert: true, //creates if doesn't exist
            new: true, //returns the updated document
            runValidators: true //ensures schema validation
        }
      );
      console.log(user ? "👤 user exists" : "🆕 new user needed");
  
      if (!user) {
        throw new Error('❌ User creation failed - possible duplicate email');
      }

        await user.save();
        console.log("🆕 user created:", user._id);
  
      //generate JWT token using MongoDB _id
      const backendToken = user.generateAuthToken();
  
      //return user data (including _id)
      res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email, // School email (may be null)
        gmail: user.gmail, // Google email
        token: backendToken,
      });

    } catch (err) {
      console.error("💥 FULL ERROR:", err);
      res.status(500).json({
        message: 'Login failed',
        error: err.message,
        stack: err.stack //only for development
      });
    }
  });

module.exports = app;