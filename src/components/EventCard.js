
import React from 'react';
import PropTypes from 'prop-types';
import EventButtons from './EventButtons';
import '../css/modules/EventCard.css';

const EventCard = ({ 
  event, 
  user, 
  navigate, 
  rsvpStatus, 
  setRsvpStatus,
  setCurrentEvent,
  setIsModalOpen,
  showButtons = true 
}) => {
  return (
    <div className="event-card-container">

      <div className="event-poster-container">
        {event.imageUrl ? (
          <img 
            src={event.imageUrl} 
            alt={`${event.title} poster`}
            className="event-poster"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.classList.add('no-image');
            }}
          />
        ) : (
          <div className="event-poster-placeholder">
            <span>{event.title}</span>
          </div>
        )}
      </div>
      
      <div className="event-details">
        <h3 className="event-title">{event.title}</h3>
        <div className="event-meta">
          <p className="event-date">
            <strong>Date: </strong>
            {new Date(event.date).toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric'
            })}
          </p>
          <p className="event-location">
            <strong>Location: </strong>
            {event.location}
          </p>
          {event.description && (
            <p className="event-description">
              <strong>Description: </strong>
              {event.description}
            </p>
          )}
        </div>

        {showButtons && (
          <EventButtons
            event={event}
            user={user}
            navigate={navigate}
            rsvpStatus={rsvpStatus}
            setRsvpStatus={setRsvpStatus}
            setCurrentEvent={setCurrentEvent}
            setIsModalOpen={setIsModalOpen}
          />
        )}
      </div>
    </div>
  );
};

EventCard.propTypes = {
  event: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    description: PropTypes.string,
    imageUrl: PropTypes.string,
    appReq: PropTypes.bool
  }).isRequired,
  user: PropTypes.object,
  navigate: PropTypes.func.isRequired,
  rsvpStatus: PropTypes.object.isRequired,
  setRsvpStatus: PropTypes.func.isRequired,
  setCurrentEvent: PropTypes.func.isRequired,
  setIsModalOpen: PropTypes.func.isRequired,
  showButtons: PropTypes.bool
};

export default EventCard;