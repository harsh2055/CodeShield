// client/src/hooks/useExplain.js
import { useState, useCallback } from 'react';

const useExplain = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);
  const [explanationId, setExplanationId] = useState(null);

  const processStream = async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentMessage = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last incomplete line in the buffer

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
              setError(data.error);
              return;
            }
            if (data.content) {
              currentMessage += data.content;
              setMessages(prev => {
                const newMessages = [...prev];
                // Update the last message if it's from the assistant, otherwise add it
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                  newMessages[newMessages.length - 1].content = currentMessage;
                } else {
                  newMessages.push({ role: 'assistant', content: currentMessage });
                }
                return newMessages;
              });
            }
            if (data.done) {
              if (data.explanationId) setExplanationId(data.explanationId);
            }
          } catch (e) {
            console.error('SSE Parse Error:', e, dataStr);
          }
        }
      }
    }
  };

  const explain = useCallback(async ({ code, language, level, modelId, action = 'explain', errorMessage = '', teamId }) => {
    setLoading(true);
    setError(null);
    setMessages([]);
    setExplanationId(null);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cl_token')}`
        },
        body: JSON.stringify({ code, language, level, modelId, action, errorMessage, teamId: teamId === 'personal' ? undefined : teamId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }

      await processStream(response);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendFollowUp = useCallback(async (message) => {
    if (!explanationId) return;
    
    setLoading(true);
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: message }]);

    try {
      const response = await fetch(`/api/explain/${explanationId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cl_token')}`
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }

      await processStream(response);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [explanationId]);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    setMeta(null);
    setExplanationId(null);
  }, []);

  return { explain, sendFollowUp, messages, loading, error, meta, reset };
};

export default useExplain;
