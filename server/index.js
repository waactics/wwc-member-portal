const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const User = require('./Models/User');
const RegularEvent = require('./Models/RegularEvent');
const EventApplication = require('./Models/EventApplication'); 
const RSVP = require("./Models/RSVP");
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const jwt = require('jsonwebtoken'); // TESTING RQQQ: i dont like u jwt
const bcrypt = require('bcrypt'); // TESTING RQQQ: being difficult boohoo

require('./db/connection');

const app = express();
app.use(express.json()); //middleware to parse JSON requests
app.use(express.urlencoded({ extended: true }));

//app.use(cors());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/* PURPOSE: Set up Multer for File Uploads */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './files');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });


/* PURPOSE: User Registration with Authentication */
app.post('/register', async (req, res) => {
  try {
    console.log('Received registration data:', req.body);
    
    const { name, email, password, pronouns, major, year, JPMorgan } = req.body; //manually extract file if using multipart/form data
    
    const user = new User({
      name,
      email,
      password,
      pronouns,
      major,
      year,
      JPMorgan: JPMorgan === 'true',
      isAdmin: email === 'utdwwc@gmail.com'
    }); //creates user object

    if (req.file) {
      user.resume = {
        path: req.file.path,
        contentType: req.file.mimetype
      };
    }//adds resume IF file exists

    await user.save();
    console.log('User created successfully:', user);

    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      'your-secret-key',
      { expiresIn: '1h' }
    ); //generates token

    res.status(201).json({ 
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/* PURPOSE: General User Creation */
app.post('/', upload.single('resume'), async (req, res) => {
  try {
    const { 
      name = '', 
      email = '', 
      gmail = '', 
      password = '', 
      pronouns = '', 
      major = '', 
      year = '', 
      JPMorgan = 'false'
    } = req.body;

    if (!name || !email || !gmail) {
      return res.status(400).json({ 
        error: 'Missing required fields (name, email, or gmail)' 
      });
    } //validate required fields

    const userData = {
      name,
      email,
      gmail,
      password,
      pronouns,
      major,
      year,
      JPMorgan: JPMorgan === 'true',
      isAdmin: email === 'utdwwc@gmail.com'
    }; //creates user object

    const newUser = new User(userData);
    const savedUser = await newUser.save();

    if (req.file) {
      userData.resume = {
        path: req.file.path,
        contentType: req.file.mimetype
      };
    } //adds resume IF file exists
    
    res.status(201).json(savedUser);
  } catch (error) {
    console.error('Detailed save error:', {
      message: error.message,
      validationErrors: error.errors,
      stack: error.stack
    });
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Email or gmail already exists' 
      });
    } //duplicates key error
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

/* PURPOSE: Fetches Registered User from Database */
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password -__v -resetToken') // Exclude sensitive fields
      .sort({ createdAt: -1 }); // Newest first
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* TESTING THIS ROUTE
   PURPOSE: Logs In Existing User */
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    } //validates input

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    } //finds user

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    } //checks password

    const token = user.generateAuthToken(); //generates token

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

/* PURPOSE: Serving Static Files from Files Directory */
app.use('/files', express.static(path.join(__dirname, 'files')));

/* PURPOSE: Checks if User ID Exists Already in Database */
app.get('/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    console.log(`Fetching user with ID: ${userId}`); //logs ID for debugging
    const user = await User.findById(userId);

    if (!user) {
      console.error(`User with ID ${userId} not found`);
      return res.status(404).send('User not found');
    } //returns user ID without password

    const { name, email, pronouns, major, year, JPMorgan, resume } = user;
    res.json({ name, email, pronouns, major, year, JPMorgan, resume });
  } catch (error) {
    console.error(`Error fetching user details for user ID: ${req.params.id}`, error);
    res.status(500).send('Server error');
  }
});

 /* PURPOSE: Checks if Gmail Exists Already in Database */
app.get('/user/gmail/:gmail', async (req, res) => {
  try {
    const gmailId = req.params.gmail;
    console.log(`Fetching user with email: ${gmailId}`); //log gmail for debugging
    const user = await User.findOne({ gmail: gmailId });
    
    if (!user) {
      console.error(`User with ID ${gmailId} not found`);
      return res.status(404).send('User not found');
    } //returns gmail ID without password

    const { name, email, gmail, pronouns, major, year, } = user;
    res.json({ name, email, gmail, pronouns, major, year});
  } catch (error) {
    console.error(`Error fetching user details for user ID: ${req.params.gmail}`, error);
    res.status(500).send('Server error');
 }
});

/* PURPOSE: Fetches Uploaded Resume for User from Database */
app.get('/user/:id/resume', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user && user.resume) {
      const filePath = path.join(__dirname, user.resume.path); //build file path
      if (fs.existsSync(filePath)) { //check if the file exists
        res.sendFile(filePath); //send the file to the client
      } else {
        console.error(`File not found: ${filePath}`);
        res.status(404).send('File not found');
      }
    } else {
      console.error(`User or resume not found for user ID: ${req.params.id}`);
      res.status(404).send('User or resume not found');
    }

  } catch (error) {
    console.error(`Server error while fetching resume for user ID: ${req.params.id}`, error);
    res.status(500).send('Server error');
  }
});

/*  <------------  EVENTS TABLE  ------------>  */

/* PURPOSE: Retrieve All Existing Events from Database */
app.get('/regularevents', async (req, res) => {
  try {
    const events = await RegularEvent.find();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

/* PURPOSE: General Event Creation */
app.post('/regularevents', async (req, res) => {
  
  try {
    console.log("Received request:", req.body); //debugging
    const {
      title,
      description,
      date,
      location,
      appReq = false,
      points = 0,
      rsvpLimit = 0,
      actualAttendees = []
    } = req.body;

    if (!title || !description || !date || !location) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (points !== undefined && typeof points !== 'number') {
      return res.status(400).json({ message: 'Points must be a number' });
    }

    // Create new event
    const newEvent = new RegularEvent({
      title,
      description,
      date: new Date(date),
      location,
      appReq,
      points: Number(points),
      rsvpLimit: Number(rsvpLimit),
      actualAttendees
  });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent); //returns saved event as json
    
  } catch (error) {
    console.error('Error creating event: ', error);
    res.status(500).json({ message: 'Error saving event: ', error: error.message });
  }
});

/* TESTING: rsvp system */
app.get('/rsvps', async (req, res) => {
  try {
    // 1. Fetch all events with their RSVPs in a single query using aggregation
    const eventsWithRsvps = await RegularEvent.aggregate([
      {
        $lookup: {
          from: "rsvps", // Collection name (case-sensitive)
          let: { eventId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$eventId", "$$eventId"] },
                status: "Going" // Only include "Going" RSVPs
              }
            },
            {
              $lookup: {
                from: "users", // User collection name
                localField: "userId",
                foreignField: "_id",
                as: "user"
              }
            },
            { $unwind: "$user" }, // Convert user array to object
            {
              $project: {
                _id: 0, // Exclude RSVP _id
                userId: "$user._id",
                userName: "$user.name",
              }
            }
          ],
          as: "rsvps"
        }
      },
      {
        $project: {
          title: 1,
          date: 1,
          location: 1,
          description: 1,
          rsvps: 1,
          rsvpCount: { $size: "$rsvps" } // Add count of RSVPs
        }
      }
    ]);

    // 2. Logging for debugging (optional)
    console.log(`Fetched ${eventsWithRsvps.length} events with RSVPs`);

    // 3. Send response
    res.json(eventsWithRsvps);
  } catch (err) {
    console.error('Error fetching RSVPs:', err);
    res.status(500).json({ 
      error: "Failed to fetch RSVP data",
      details: err.message 
    });
  }
});
/*app.get('/rsvps', async (req, res) => {
  try {
    const events = await RegularEvent.find().lean();
    
    const eventsWithRsvps = await Promise.all(
      events.map(async (event) => {
        const rsvps = await RSVP.find({ eventId: event._id, status: "Going" })
          .populate('userId', 'name _id'); // Include user name and ID
        
        return {
          ...event,
            rsvps: rsvps.map(rsvp => ({
              userId: rsvp.userId._id,
              name: rsvp.userId.name,
            }))
        };
      })
    );
    console.log(events);
    console.log(eventsWithRsvps);
    res.json(eventsWithRsvps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});*/

/* PURPOSE: Updates who RSVP'd -> Added to Attendees List */
app.post('/regularevents/:eventId/rsvp', async (req, res) => {
  const eventId = req.params.eventId;
  const { userId, isChecked } = req.body; //now receiving isChecked from frontend

  try {
      const event = await Event.findById(eventId); //find the event by ID

      if (!event) {
          return res.status(404).json({ message: 'Event not found' });
      }

      if (isChecked) { //adds user to attendees list IF they checked the box
          if (!event.attendees.includes(userId)) {
              event.attendees.push(userId);
          } else {
              return res.status(400).json({ message: 'User has already RSVPed' });
          }
      } else { //removes user from attendees list if they unchecked the box
          event.attendees = event.attendees.filter(id => id.toString() !== userId);
      }

      await event.save(); //save the updated event

      res.status(200).json({ message: 'RSVP updated successfully', event });
  } catch (error) {
      console.error('Error RSVPing for event:', error);
      res.status(500).json({ error: 'Error RSVPing for event' });
  }
});

/* PURPOSE: Applications for Special Events saved to Database*/
app.post('/eventapplications/', async (req, res) => {
  const {
    userId,
    eventId,
    name,
    email,
    year,
    reason
  } = req.body;

  console.log('Incoming application data:', req.body);

  // Validation
  if (!name || !email || !year || !reason) {
      return res.status(400).json({ message: 'All fields except userId and eventId are required' });
  }

  try {
      const newApplication = new EventApplication({
          userId: userId || null,  // Handle cases where userId might be undefined
          eventId: eventId || null,
          name,
          email,
          year,
          reason
      });

      const savedApplication = await newApplication.save();
      res.status(201).json({ 
          message: 'Application submitted successfully',
          application: savedApplication
      });
  } catch (error) {
      console.error('Database save error:', error);
      res.status(500).json({ 
          message: 'Error submitting application',
          error: error.message 
      });
  }
});

/* PURPOSE: Fetches Event Applications with Event Details */
app.get('/eventapplications/with-events', async (req, res) => {
  try {
      const applications = await EventApplication.aggregate([
          {
              $lookup: {
                  from: "regularevents", // Your events collection name
                  localField: "eventId",
                  foreignField: "_id",
                  as: "event"
              }
          },
          { $unwind: "$event" },
          {
              $group: {
                  _id: "$eventId",
                  eventName: { $first: "$event.title" },
                  eventDate: { $first: "$event.date" },
                  applicationCount: { $sum: 1 },
                  applications: { $push: "$$ROOT" }
              }
          },
          { $sort: { eventDate: 1 } }
      ]);
      
      res.json(applications);
  } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ message: 'Error fetching applications' });
  }
});

/* PURPOSE: Adds User to Attendee List + Adds Points to User Profile */
app.post('/users', async (req, res) => {
  const { email, eventID } = req.body; 
  
  try { //checks if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found. Please register first.' });
    }

    user.points += 1; //adds points to user profile
    await user.save();

    let event = await RegularEvent.findOne({ eventID });
    const userID = user._id; //finds existing event

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (!event.attendees.includes(userID.toString())) {
      event.attendees.push(userID.toString());
      await event.save();
    } //adds user to attendee list

    res.json({ message: `Check-in successful! Your points are now ${user.points}.`, userID });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error during check-in.' });
  }
});

/*  <------------  EVENTS TABLE  ------------>  */

/* TESTINGGGG RQQQQQQQ: isAdmin middleware
const isAdmin = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Find user
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check admin status
    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
}; */
const isAdmin = async (req, res, next) => {
  const userId = req.body.userId; // Assume userId is sent in the request body
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.email !== 'utdwwc@gmail.com') {
    return res.status(403).json({ message: 'No admin privileges granted' });
  }

  if (user && user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied' });
  }
};


/* TESTINGGGG RQQQQQ: token and auth middleware
app.get('/admin/test', isAdmin, (req, res) => {
  res.json({ message: 'Admin access granted' });
}); */

app.listen(4000, () => {
  console.log('Server is running on port 4000');
});

module.exports = app;