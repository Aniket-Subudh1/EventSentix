import React from 'react';
import { Button } from '../components/common/Button';
import { 
  MessageCircle, 
  Edit,
  Codepen
} from 'react-feather';

const FeedbackLanding = ({ match }) => {
  const eventId = match.params.eventId;

  const handleChatClick = () => {
    window.location.href = `/chat/${eventId}`;
  };

  const handleFeedbackClick = () => {
    window.location.href = `/submit-feedback/${eventId}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <Codepen size={64} className="mx-auto mb-4 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Feedback</h1>
          <p className="text-gray-600">Choose how you'd like to provide feedback</p>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            fullWidth
            onClick={handleChatClick}
            icon={<MessageCircle size={20} className="mr-2" />}
          >
            <div className="text-left">
              <div className="font-semibold">Live Chat</div>
              <div className="text-sm text-gray-500">Discuss your experience in real-time</div>
            </div>
          </Button>

          <Button
            variant="outline"
            fullWidth
            onClick={handleFeedbackClick}
            icon={<Edit size={20} className="mr-2" />}
          >
            <div className="text-left">
              <div className="font-semibold">Submit Feedback</div>
              <div className="text-sm text-gray-500">Share your thoughts and suggestions</div>
            </div>
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500">
          Your feedback helps us improve the event experience
        </div>
      </div>
    </div>
  );
};

export default FeedbackLanding;