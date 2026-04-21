const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { isValidObjectId } = require('mongoose');
const User = require('./Models/User');
const RegularEvent = require('./Models/RegularEvent');
const EventApplication = require('./Models/EventApplication'); 
const RSVP = require("./Models/RSVP");
const Attendance = require("./Models/Attendance");
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authRoutes = require('./auth');
const officersRouter = require('./routes/officers.route');

require('./db/connection');
const app = express();

//root handler
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

//middleware
app.use(express.json()); //middleware to parse JSON requests
app.use(express.urlencoded({ extended: true }));

//routes
app.use('/api', authRoutes);
app.use('/api/officers', officersRouter);

//CORS
const corsOptions = {
  origin: [
    'https://wwc-member-portal.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Add OPTIONS explicitly
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'] // Add Authorization header
};

app.use(cors(corsOptions));

// Explicitly handle preflight requests for all routes
app.options('*', cors(corsOptions));

/*const corsOptions = {
  origin: [
    'https://wwc-member-portal.vercel.app', // Vercel frontend
    'http://localhost:3000', // local development
    'http://localhost:3001' // optional: other local ports
  ],
  credentials: true, // If you're using cookies/auth tokens
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
*/

/*  ==========================================  */
/*  =============  UPLOAD SETUP  =============  */
/*  ==========================================  */

//ensure 'uploads' directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

//multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); //save to ./uploads/
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

//app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//serving static files from files directory
app.use('/files', express.static(path.join(__dirname, 'files')));


/*  ==========================================  */
/*  =============  USER ROUTES  ==============  */
/*  ==========================================  */

// PURPOSE: Fetches Registered User from Database
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password -__v -resetToken') //exclude sensitive fields
      .sort({ createdAt: -1 }); //newest first
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* PURPOSE: Fetches Existing User Profile in the Database */
app.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -googleId -__v'); //exclude sensitive fields
    
    if (!user) return res.status(404).send('User not found');
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      utdEmail: user.utdEmail,
      pronouns: user.pronouns,
      major: user.major,
      year: user.year,
      points: user.points || 0,
      attendedEvents: user.attendedEvents,
    });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

/* PURPOSE: Updates Existing User Profile in the Database */
app.patch('/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body; //fields to update (pronouns, major, etc)

    console.log(`updating user ${userId} with:`, updates);

    //validate updates - prevent updating protected fields like googleId
    const allowedUpdates = ['pronouns', 'major', 'year', 'utdEmail'];
    const isValidUpdate = Object.keys(updates).every(key => allowedUpdates.includes(key));

    if (!isValidUpdate) {
      return res.status(400).send({ error: 'Invalid updates!' });
    }

    //find and update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true } //return updated user + validate data
    ).select('-googleId -__v'); //exclude sensitive/uneeded fields

    if (!updatedUser) {
      console.error(`User ${userId} not found`);
      return res.status(404).send('User not found');
    }

    console.log(`Successfully updated user ${userId}`);
    res.json(updatedUser);

  } catch (error) {
    console.error(`Update failed for ${req.params.id}:`, error);
    res.status(500).send({ error: 'Server error during update' });
  }
});

 /* PURPOSE: Checks if Gmail Exists Already in Database */
app.get('/user/gmail/:gmail', async (req, res) => {
  try {
    const gmailId = req.params.gmail;
    console.log(`fetching user with email: ${gmailId}`); //debugging

    const user = await User.findOne({ gmail: gmailId }).lean();
    
    if (!user) {
      console.error(`user not found: ${gmailId}`);
      return res.status(404).send('user not found');
    } //returns gmail ID without password

    //response object
    const userProfile = {
      name: user.name,
      email: user.email || user.gmail,
      pronouns: user.pronouns,
      major: user.major,
      year: user.year
    };

    console.log(`returning profile for: ${gmailId}`);
    res.json(userProfile);

  } catch (error) {
    console.error(`server error fetching: ${req.params.gmail}:`, error);
    res.status(500).json({ message: 'server error', error: error.message });
 }
});


/*  ==========================================  */
/*  ============== EVENT ROUTES ==============  */
/*  ==========================================  */

/* PURPOSE: Retrieve All Existing Events from Database */
app.get('/regularevents', async (req, res) => {
  try {
    const events = await RegularEvent.find();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

/* PURPOSE: Admin Event Creation */
app.post('/regularevents', upload.single('poster'), async (req, res) => {
  try {
    console.log("Received request:", {
      body: req.body,
      file: req.file ? `File received: ${req.file.originalname}` : 'No file received'
    });

    // Parse form data
    const {
      title,
      description,
      date,
      location,
      appReq = 'false', // Default as string since FormData sends strings
      points = '0'      // Default as string
    } = req.body;

    // Handle file upload
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Validate required fields
    if (!title || !description || !date || !location) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Convert values to proper types
    const parsedAppReq = appReq === 'true';
    const parsedPoints = parseInt(points);
    
    // Validate points is a valid number
    if (isNaN(parsedPoints)) {
      return res.status(400).json({ message: 'Points must be a valid number' });
    }

    // Create new event (without any rsvp fields)
    const newEvent = new RegularEvent({
      title,
      description,
      date: new Date(date),
      location,
      appReq: parsedAppReq,
      points: parsedPoints,
      actualAttendees: [], // Explicit empty array
      imageUrl
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
    
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      message: 'Error saving event',
      error: error.message
    });
  }
});

// DELETE event
app.delete('/regularevents/:id', async (req, res) => {
  try {
    const event = await RegularEvent.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Optionally delete associated RSVPs and attendances
    await RSVP.deleteMany({ eventId: req.params.id });
    await Attendance.deleteMany({ eventId: req.params.id });
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH event (for updates from admin side)
app.patch('/regularevents/:id', upload.single('poster'), async (req, res) => {
  try {
    const updates = {
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
      location: req.body.location,
      appReq: req.body.appReq === 'true',
      points: parseInt(req.body.points) || 0
    };

    if (req.file) {
      // Store relative path starting from 'uploads/'
      updates.imageUrl = `uploads/${req.file.filename}`;
    }

    const updatedEvent = await RegularEvent.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PURPOSE: Fetches Events (for event check-in page)
app.get('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    // 1. Validate eventId format (MongoDB ObjectId)
    if (!isValidObjectId(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID format' });
    }

    // 2. Fetch event with only the required fields (security & performance)
    const event = await RegularEvent.findById(eventId).select('_id title date location');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // 3. Return the event data
    res.json(event);
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Server error' 
    });
  }
});


/*  ==========================================  */
/*  ==============  RSVP ROUTES ==============  */
/*  ==========================================  */

/* PURPOSE: Retrieves RSVP Data */
app.get('/rsvps', async (req, res) => {
  try {
    const eventsWithRsvps = await RegularEvent.aggregate([
      {
        $lookup: {
          from: "rsvps",
          let: { eventId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$eventId", "$$eventId"] },
                status: "Going"
              }
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
              }
            },
            { $unwind: "$user" },
            {
              $project: {
                _id: 1, // Keep the RSVP ID
                userId: 1,
                userName: "$user.name",
                utdEmail: "$user.utdEmail",
                status: 1,
                createdAt: 1
              }
            }
          ],
          as: "rsvps"
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          date: 1,
          location: 1,
          description: 1,
          rsvps: 1,
          rsvpCount: { $size: "$rsvps" }
        }
      }
      //removed the $match filter to include all events, not just those with RSVPs
    ]);

    res.json(eventsWithRsvps);
  } catch (err) {
    console.error('Error fetching RSVPs:', err);
    res.status(500).json({ error: "Failed to fetch RSVP data" });
  }
});

/* PURPOSE: Updates Database with who RSVP'd */
app.post('/regularevents/:eventId/rsvp', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId, userName, isChecked } = req.body;

    // Validate event and user
    const [event, user] = await Promise.all([
      RegularEvent.findById(eventId),
      User.findById(userId)
    ]);
    if (!event) throw new Error("Event not found");
    if (!user?.utdEmail) throw new Error("User must have a UTD email to RSVP");

    // Update RSVP
    let rsvp;
    if (isChecked) {
      rsvp = await RSVP.findOneAndUpdate(
        { eventId, userId },
        { $set: { status: "Going", userName, utdEmail: user.utdEmail } },
        { upsert: true, new: true }
      );
    } else {
      await RSVP.deleteOne({ eventId, userId });
    }

    res.status(200).json({ 
      message: `RSVP ${isChecked ? "added" : "removed"}`,
      status: isChecked ? "Going" : "Not Going",
      rsvp: isChecked ? rsvp : null // Optional
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


/*  ==========================================  */
/*  =========== APPLICATION ROUTES ===========  */
/*  ==========================================  */

/* PURPOSE: Saves Speed Mentoring Applications to Database*/
app.post('/eventapplications/', async (req, res) => {
  const {
    userId,
    eventId,
    name,
    pronouns,
    email,
    year,
    grad,
    history,
    reason
  } = req.body;

  console.log('Incoming application data:', req.body);

  //validation
  if (!name || !pronouns || !email || !year || !grad || !history || !reason) {
      return res.status(400).json({ message: 'All fields except userId and eventId are required' });
  }

  try {
      const newApplication = new EventApplication({
          userId: userId || null,  //handle cases where userId might be undefined
          eventId: eventId || null,
          name,
          pronouns,
          email,
          year,
          grad,
          history,
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

/* PURPOSE: Fetches Event Applications */
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


/*  ==========================================  */
/*  ============ ATTENDANCE ROUTES ===========  */
/*  ==========================================  */

// PURPOSE: Records a User's Attendance + Updates their Profile
app.post('/api/events/:eventId/check-in', async (req, res) => {
  try {
    console.log('Received check-in request:', req.params, req.body);

    const { eventId } = req.params;
    const { userId } = req.body; //or get userId from auth middleware (recommended)

    //validate event and user
    console.log('Looking for event:', eventId);
    const [event, user] = await Promise.all([
      RegularEvent.findById(eventId),
      User.findById(userId)
    ]);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (!user) return res.status(404).json({ error: "User not found" });

    //prevent duplicate check-ins
    console.log('Looking for user:', userId);
    const existingAttendance = await Attendance.findOne({ eventId, userId });
    if (existingAttendance) {
      return res.status(400).json({ error: "User already checked in" });
    }

    //create attendance record
    const attendance = new Attendance({
      eventId,
      userId,
      userName: user.name,
      utdEmail: user.utdEmail,
      eventTitle: event.title,
      pointsAwarded: event.points
    });
    await attendance.save();

    //update user's profile (denormalize)
    await User.findByIdAndUpdate(userId, {
      $inc: { points: event.points },
      $push: {
        attendedEvents: {
          eventId,
          title: event.title,
          date: event.date,
          pointsEarned: event.points,
          checkInTime: new Date()
        }
      }
    });

    res.status(201).json({ success: true, attendance });
  } catch (err) {
    console.error('Full error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// PURPOSE: Fetches All Attendees for a Specific Event
app.get('/api/events/:eventId/attendees', async (req, res) => {
  try {
    const { eventId } = req.params;

    const attendees = await Attendance.find({ eventId })
      .sort({ checkInTime: -1 }) //newest first
      .select('userId userName utdEmail checkInTime pointsAwarded');

    res.status(200).json(attendees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PURPOSE: Fetches a User's Attendance History
app.get('/api/events/users/:userId/attendance', async (req, res) => {
  try {
    const { userId } = req.params;

    const userAttendance = await Attendance.exists({ userId })

    res.status(200).json(userAttendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PURPOSE: Retrieves Attendance
app.get('/events/attendance', async (req, res) => {
  try {
    const eventsWithAttendance = await RegularEvent.aggregate([
      {
        $lookup: {
          from: 'attendances',
          let: { eventId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$eventId", "$$eventId"] }
              }
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
              }
            },
            { $unwind: "$user" },
            {
              $project: {
                _id: 1,
                userId: 1,
                userName: "$user.name",
                utdEmail: "$user.utdEmail",
                checkInTime: 1,
                pointsAwarded: 1
              }
            }
          ],
          as: 'attendees'
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          date: 1,
          location: 1,
          description: 1,
          attendees: 1,
          attendanceCount: { $size: "$attendees" }
        }
      },
      { $sort: { date: -1 } }
    ]);
    
    res.json(eventsWithAttendance);
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: err.message });
  }
});


/*  ==========================================  */
/*  ============ SERVER CONNECTION ===========  */
/*  ==========================================  */

/* GORL idk why but i have to comment
these out/back in all the time */
app.listen(4000, () => {
  console.log('Server is running on port 4000');
});

module.exports = app;