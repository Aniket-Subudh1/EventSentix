// src/pages/SosButton.js
import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import "../pages/css/sos.css";

const SosButton = () => {
  const { eventId } = useParams();
  const navigate = useNavigate(); // For redirecting to login if needed
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [alertSent, setAlertSent] = useState(false);

  const sendSOS = async () => {
    if (loading) return;

    // Retrieve token from localStorage (or your auth context)
    const token = localStorage.getItem('token'); // Adjust based on your auth setup

    if (!token) {
      alert('You must be logged in to send an SOS.');
      navigate('/login'); // Redirect to login page
      return;
    }

    setLoading(true);
    setAlertSent(false);

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          await axios.post(
            'http://localhost:5000/api/alerts',
            {
              type: 'sos',
              userName,
              latitude,
              longitude,
              accuracy,
              message: message || undefined,
              event: eventId, // Include event ID
            },
            {
              headers: {
                Authorization: `Bearer ${token}`, // Include token in headers
                'Content-Type': 'application/json',
              },
            }
          );

          setAlertSent(true);
          setLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location.');
          setLoading(false);
        },
        { enableHighAccuracy: true }
      );
    } catch (error) {
      console.error('Error sending SOS:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        alert('Session expired or unauthorized. Please log in again.');
        localStorage.removeItem('token'); // Clear invalid token
        navigate('/login');
      } else {
        alert('Failed to send SOS alert: ' + (error.response?.data?.message || error.message));
      }
      setLoading(false);
    }
  };

  return (
    <div className="sos-container">
      <h1>Emergency SOS</h1>
      <div className="form-group">
        <label>Your Name (Optional)</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Enter your name"
        />
      </div>
      <div className="form-group">
        <label>Emergency Message (Optional)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your emergency"
        />
      </div>
      <button
        className={`sos-button ${loading ? 'loading' : ''}`}
        onClick={sendSOS}
        disabled={loading}
      >
        {loading ? 'Sending...' : 'SOS'}
      </button>
      {alertSent && (
        <div className="alert-success">
          SOS alert sent successfully!
        </div>
      )}
    </div>
  );
};

export default SosButton;