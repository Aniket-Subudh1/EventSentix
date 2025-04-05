import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import api from '../services/api';

const SubmitFeedback = () => {
  const { eventId } = useParams();
  const [text, setText] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/feedback/submit', {
        event: eventId,
        text,
        username,
        source: 'direct',
      });
      setStatus('success');
      setText('');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4">Submit Feedback</h1>
      {status === 'success' && (
        <div className="mb-4 text-green-600">Feedback submitted!</div>
      )}
      {status === 'error' && (
        <div className="mb-4 text-red-600">Error submitting feedback.</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Your name"
          className="w-full p-2 border rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <textarea
          placeholder="Your feedback"
          className="w-full p-2 border rounded"
          rows="4"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" variant="primary">Submit</Button>
      </form>
    </div>
  );
};

export default SubmitFeedback;
