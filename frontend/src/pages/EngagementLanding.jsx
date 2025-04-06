import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';

const EngagementLanding = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <h2 className="text-xl font-bold mb-4">Welcome to the Event</h2>
      <p className="text-gray-600 mb-6">Choose how you'd like to engage:</p>

      <div className="flex flex-col space-y-4 w-full max-w-xs">
        <Button onClick={() => navigate(`/chat/${eventId}`)}>💬 Join Chat</Button>
        <Button onClick={() => navigate(`/qna/${eventId}`)}>❓ Live Q&A</Button>
        <Button onClick={() => navigate(`/submit-feedback/${eventId}`)}>📝 Fill Survey</Button>
        <Button onClick={() => navigate(`/sos/${eventId}`)}>❗SOS</Button>
      </div>
    </div>
  );
};

export default EngagementLanding;
