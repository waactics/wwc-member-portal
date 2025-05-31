import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Modal from './Modal'; //adjust the path to your modal component
import { jwtDecode } from 'jwt-decode';
import './css/RegularEvents.css';
import { toZonedTime } from 'date-fns-tz';

const RegularEventsPage = () => {
    const navigate = useNavigate(); //helps move between pages dynamically
    const location = useLocation(); //extracts user data (ID, GMail, Name) passed from previous page
    
    const [user, setUser] = useState({
        id: null,
        email: null,
        name: '',
        _id: null //mongoDB ID
    });
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [events, setEvents] = useState([]);
    const [rsvpStatus, setRsvpStatus] = useState({});
    const [currentEvent, setCurrentEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    /* PURPOSE: Retrieves list of existing events from backend */
    const fetchEvents = async (targetUser) => {
        try {
            console.log("fetching events for user: ", targetUser);
            const response = await fetch('http://localhost:4000/regularevents', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();
            console.log("events response: ", data);
            setEvents(data);
            
            //initialize RSVP status
            const initialRsvpStatus = {};
            data.forEach(event => {
                initialRsvpStatus[event._id] = event.actualAttendees?.includes(targetUser._id) || false;
            });
            setRsvpStatus(initialRsvpStatus);
          } catch (error) {
            console.error("Fetch error:", {
                message: error.message,
                userState: user,
                timestamp: new Date().toISOString()
            });
          } finally {
            setLoading(false);
          }
    };

    /* PURPOSE: Get User Data from location OR localStorage */
    useEffect(() => {
        const loadUserData = async () => {
            try {
              const storedUser = JSON.parse(localStorage.getItem('user'));
              if (!storedUser?._id) {
                navigate('/');
                return;
              }
        
              // Fetch COMPLETE user data from backend
              const response = await fetch(`http://localhost:4000/user/${storedUser._id}`, {
                headers: {
                  'Authorization': `Bearer ${storedUser.token}`
                }
              });
        
              if (!response.ok) throw new Error('Failed to fetch user data');
              
              const completeUser = await response.json();
              console.log('Complete user data:', completeUser); // Verify ALL fields exist
              setUser(completeUser);
              localStorage.setItem('user', JSON.stringify(completeUser)); // Update storage
        
            } catch (error) {
              console.error('Error loading user:', error);
              navigate('/');
            }
          };
        
          loadUserData();
    }, [navigate]);

    /* PURPOSE: Shows Events if User is Authenticated */
    useEffect(() => {
        if (user._id) {
          fetchEvents(user); //pass the current user
        }
    }, [user._id]);
    
    /* PURPOSE: RSVP Handler with User Verification */
    const handleCheckboxChange = async (eventId) => {
        console.group(`RSVP update for event ${eventId}`);
        console.log("Current user state:", user);

        if (!user._id) {
            console.error("Missing user ID - cannot RSVP");
            alert("Please login again");
            navigate('/');
            return;
        }

        const currentStatus = rsvpStatus[eventId] || false;
        const newStatus = !currentStatus;
    
        try {
            console.log("Sending RSVP request with:", {
                eventId,
                userId: user._id,
                newStatus
            });
            
            const response = await fetch(`http://localhost:4000/regularevents/${eventId}/rsvp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // Added auth
                },
                body: JSON.stringify({
                    userId: user._id, //mongoDB ID
                    googleId: user.id, //google ID
                    userName: user.name,
                    userEmail: user.email,  
                    isChecked: newStatus 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Backend error response:", errorData);
                throw new Error(errorData.message || "RSVP update failed");
            }

            const result = await response.json();
            console.log("RSVP successful, server response:", result.status);

            //update local state
            setRsvpStatus(prev => ({
                ...prev,
                [eventId]: newStatus
            }));
            
            //only show modal if RSVPing
            if (newStatus) {
                const event = events.find(e => e._id === eventId);
                if (!event) {
                    console.warn("Event not found for modal:", eventId);
                    return;
                }
                setCurrentEvent(event);
                setIsModalOpen(true);
            }
        } catch (error) {
            console.error('RSVP error:', {
                message: error.message,
                stack: error.stack,
                eventId,
                userId: user._id,
                statusAttempted: newStatus
            });

            //revert UI state on error
            setRsvpStatus(prev => ({
                ...prev,
                [eventId]: currentStatus //revert to previous status
            }));

            alert(`RSVP failed: ${error.message}`);
        } finally {
            console.groupEnd();
        }
    };

    /* TESTING: Button Rendering */
    const getEventButtons = (event, user, navigate, rsvpStatus, handleCheckboxChange) => {        
        const now = new Date();
        const eventDate = new Date(event.date);
        
        // Add 1 day to the event date (to make it the next day)
        eventDate.setDate(eventDate.getDate() + 1)
        
        //convert to CST
        const nowCST = toZonedTime(now, 'America/Chicago');
        const eventDateCST = toZonedTime(eventDate, 'America/Chicago');

        //TEMPORARILY TESTING: set check-in period end time (10:00PM CST)
        const checkInEnd = new Date(eventDateCST);
        checkInEnd.setHours(20, 0, 0, 0); //10:00PM CST

        // DEBUG: Critical time values
        console.log('TIME DEBUG:', {
            currentTime: nowCST.toString(),
            eventDate: eventDateCST.toString(),
            checkInEnd: checkInEnd.toString(),
            isSameDay: (
                eventDateCST.getDate() === nowCST.getDate() &&
                eventDateCST.getMonth() === nowCST.getMonth() &&
                eventDateCST.getFullYear() === nowCST.getFullYear()
            ),
            isFuture: nowCST < eventDateCST,
            isPast: nowCST > checkInEnd
        });
        
        //check if event is in the past (after 8:00PM CST on event day)
        if (nowCST > checkInEnd) {
            return <p className="event-passed-message">Event has passed</p>;
        }
        
        //check if event is today in CST
        const isEventToday = 
            eventDateCST.getDate() === nowCST.getDate() &&
            eventDateCST.getMonth() === nowCST.getMonth() &&
            eventDateCST.getFullYear() === nowCST.getFullYear();
        
        //check if current time is between 6:45PM and 8:00PM CST on event day
        // Check if current time is between 6:45PM and 8:00PM CST on event day
        const isCheckInPeriod = isEventToday && (
            (nowCST.getHours() === 17 && nowCST.getMinutes() >= 0) ||  // 5:00 PM - 5:59 PM
            (nowCST.getHours() >= 18 && nowCST.getHours() <= 19) ||    // 6:00 PM - 7:59 PM
            (nowCST.getHours() === 20 && nowCST.getMinutes() === 0)    // 8:00 PM exactly
        );

        // ====== 1. during check-in period (ONLY show check-In) ======
        if (isCheckInPeriod) {
            return (
                <button 
                    onClick={() => navigate('/eventcheckin', { 
                        state: { 
                            eventId: event._id,
                            eventTitle: event.title,
                            userId: user._id,
                            name: user.name,
                            email: user.email,
                        }
                    })}
                    className="event-button event-button--primary"
                >
                    Check-In!
                </button>
            );
        }
    
        // ====== 2. if event is in the future (NOT today) ======
        if (!isEventToday && nowCST < eventDateCST) {
            if (event.appReq) {
                return (
                    <button 
                        onClick={() => navigate('/eventapplications', { 
                            state: { 
                                eventId: event._id,
                                eventTitle: event.title,
                                userId: user._id,
                                name: user.name,
                                email: user.email,
                            }
                        })}
                        className="event-button event-button--primary"
                    >
                        Apply!
                    </button>
                );
            } else {
                return (
                    <>
                        <label className="event-label">
                            <input 
                                type="checkbox" 
                                checked={rsvpStatus[event._id] || false} 
                                onChange={() => handleCheckboxChange(event._id)} 
                                className="event-checkbox" 
                            />
                            RSVP
                        </label>
                        {rsvpStatus[event._id] && <p className="confirmation-message">You have RSVPed!</p>}
                    </>
                );
            }
        }
    
        // ====== 3. if it's event day but NOT check-in period (before 6:45 PM) ======
        if (isEventToday && !isCheckInPeriod) {
            if (event.appReq) {
                return (
                    <button 
                        onClick={() => navigate('/eventapplications', { 
                            state: { 
                                eventId: event._id,
                                eventTitle: event.title,
                                userId: user._id,
                                name: user.name,
                                email: user.email,
                            }
                        })}
                        className="event-button event-button--primary"
                    >
                        Apply!
                    </button>
                );
            } else {
                return (
                    <>
                        <label className="event-label">
                            <input 
                                type="checkbox" 
                                checked={rsvpStatus[event._id] || false} 
                                onChange={() => handleCheckboxChange(event._id)} 
                                className="event-checkbox" 
                            />
                            RSVP
                        </label>
                        {rsvpStatus[event._id] && <p className="confirmation-message">You have RSVPed!</p>}
                    </>
                );
            }
        }
    
        // Default fallback (shouldn't reach here)
        return null;
    };
  
    /* PURPOSE: Generates a Google Calendar Event link */
    const handleAddToCalendar = () => {
        if (!currentEvent) return;
        
        const formatDate = (dateString, hours, minutes) => { //formats date in googcal's required format
            const date = new Date(dateString);
            date.setHours(hours, minutes, 0, 0);
            return date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';
        };

        const eventStartDate = formatDate(currentEvent.date, 19, 0); //automatically is 7:00 PM
        const eventEndDate = formatDate(currentEvent.date, 20, 0);   //automatically is 8:00 PM
    
        const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${currentEvent.title}&details=${currentEvent.description}&location=${currentEvent.location}&dates=${eventStartDate}/${eventEndDate}`;
        
        window.open(calendarUrl, '_blank');
        setIsModalOpen(false);
    };

    /* PURPOSE: Only Allows WWC Email into Admin Page */
    const handleClick = () => {
        if (user?.email === "utdwwc@gmail.com" ||
            user?.utdEmail === "utdwwc@gmail.com") {
                navigate('/admin', {
                    state: {
                        user: user
                    }
                });
        } else {
            alert("boohoo u aren't admin");
        }
    };

    /* PURPOSE: Sorts Events by Date in Descending Order (Newest First) */
    const sortedEvents = [...events].sort((a, b) => new Date(b.date) - new Date(a.date));


    return (
        <div className="regular-events">
            <h1 className="page-title">Women Who Compute Events</h1>
            
            {/* Navigation buttons (moved outside event mapping) */}
            <div className="event-container">
                <button
                    className="event-button event-button--primary"
                    onClick={() => navigate('/')}
                >
                    Homepage
                </button>
                
                <button
                    className="event-button event-button--primary"
                    onClick={() => {
                        //ensure we have complete object
                        if (!user || !user._id) {
                            alert('User data not loaded yet');
                            return;
                        }

                        //verify required fields exist
                        if (!user.utdEmail) {
                            console.error('Missing email:', user);
                            alert('Profile incomplete - please update your email first');
                            return;
                        }
                        
                        navigate('/profile', {
                            state: {
                              user: {
                                _id: user._id,
                                name: user.name,
                                email: user.email,
                                utdEmail: user.utdEmail || '',  //fallback if missing
                                pronouns: user.pronouns || '',  //fallback if missing
                                major: user.major || '',        //fallback if missing
                                year: user.year || ''           //fallback if missing
                              }
                            } 
                          });
                    }}
                >
                    User Profile
                </button>

                <button
                    className="event-button event-button--primary"
                    onClick={handleClick}
                >
                    Admin Dashboard
                </button>
            </div>
            
            {sortedEvents.map((event) => (
            <div key={event._id} className="event-container">
                <h1 className="event-title">Event: {event.title}</h1>
                <p><strong>Description:</strong> {event.description}</p>
                <p><strong>Date:</strong> {`${String(new Date(event.date).getUTCMonth()+1).padStart(2, '0')}/${String(new Date(event.date).getUTCDate()).padStart(2, '0')}/${new Date(event.date).getUTCFullYear()}`}</p>
                <p><strong>Location:</strong> {event.location}</p>
                
                {getEventButtons(event, user, navigate, rsvpStatus, handleCheckboxChange)}
                
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    onAddToCalendar={handleAddToCalendar} 
                    event={currentEvent}
                />
            </div>
        ))}
            {/*sortedEvents.map((event) => (
                <div key={event._id} className="event-container">
                    <h1 className="event-title">Event: {event.title}</h1>
                    <p><strong>Description:</strong> {event.description}</p>
                    <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
                    <p><strong>Location:</strong> {event.location}</p>
                    
                    {event.appReq ? (
                        <>
                        <button 
                            onClick={() => navigate('/eventapplications', { 
                                state: { 
                                    eventId: event._id,
                                    eventTitle: event.title,
                                    userId: user._id,
                                    name: user.name,
                                    email: user.email,
                                }
                            })}
                        className="event-button event-button--primary"
                      >
                        Apply!
                      </button>

                      <button 
                            onClick={() => navigate('/eventcheckin', { 
                                state: { 
                                    eventId: event._id,
                                    eventTitle: event.title,
                                    userId: user._id,
                                    name: user.name,
                                    email: user.email,
                                }
                            })}
                        className="event-button event-button--primary"
                      >
                        Check-In!
                      </button>
                      </>
                    ) : (
                        <>
                            <label className="event-label">
                                <input 
                                    type="checkbox" 
                                    checked={rsvpStatus[event._id] || false} 
                                    onChange={() => handleCheckboxChange(event._id)} 
                                    className="event-checkbox" 
                                />
                                RSVP
                            </label>
                            {rsvpStatus[event._id] && <p className="confirmation-message">You have RSVPed!</p>}

                            <button 
                                onClick={() => navigate('/eventcheckin', { 
                                    state: { 
                                        eventId: event._id,
                                        eventTitle: event.title,
                                        userId: user._id,
                                        name: user.name,
                                        email: user.email,
                                    }
                                })}
                                className="event-button event-button--primary"
                            >
                                Check-In!
                            </button>
                        </>
                    )}
                    
                    <Modal 
                        isOpen={isModalOpen} 
                        onClose={() => setIsModalOpen(false)} 
                        onAddToCalendar={handleAddToCalendar} 
                        event={currentEvent}
                    />
                </div>
            ))*/}

        </div>
    );
};

export default RegularEventsPage;
