import React, { useEffect, useState, useRef } from 'react';
import { initializeAssistant } from './utils/assistant';
import { getCycleDay } from './utils/cycle';

export const App = () => {
  const [cycleStartDate, setCycleStartDate] = useState<string | null>(localStorage.getItem('cycleStartDate'));
  const [adviceText, setAdviceText] = useState<string>('');

  const cycleRef = useRef(cycleStartDate);

  useEffect(() => {
    cycleRef.current = cycleStartDate;
  }, [cycleStartDate]);

  const assistantRef = useRef<ReturnType<typeof initializeAssistant> | null>(null);

  useEffect(() => {
    assistantRef.current = initializeAssistant(() => ({
      item_selector: {
        items: []
      }
    }));

    assistantRef.current.on('data', (cmd: any) => {
      // Ищем action в data payload-ах
      const action = cmd.action || cmd.smart_app_data || cmd;
      if (!action || !action.type) return;

      switch (action.type) {
        case 'START_CYCLE': {
          const todayStart = new Date().toISOString();
          setCycleStartDate(todayStart);
          localStorage.setItem('cycleStartDate', todayStart);
          localStorage.removeItem('cycleEndDate');
          break;
        }
        case 'END_CYCLE': {
          localStorage.setItem('cycleEndDate', new Date().toISOString());
          break;
        }
        case 'GET_ADVICE_REQUESTED': {
          if (!cycleRef.current) {
            assistantRef.current?.sendData({
               action: { action_id: 'NO_CYCLE_STARTED' }
            });
          } else {
            const currentDay = getCycleDay(cycleRef.current);
            assistantRef.current?.sendData({
               action: { action_id: 'FETCH_LLM_ADVICE', parameters: { day: currentDay } }
            });
          }
          break;
        }
        case 'SHOW_ADVICE': {
          if (action.parameters?.advice) {
            setAdviceText(action.parameters.advice);
          }
          break;
        }
        default:
          break;
      }
    });

    return () => {
      assistantRef.current = null;
    };
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Женский календарь</h1>
      <p style={{ fontSize: '18px' }}>
        <strong>Старт текущего цикла:</strong> {cycleStartDate ? new Date(cycleStartDate).toLocaleDateString() : 'Не отмечено'}
      </p>

      {adviceText && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <p><strong>Совет от ассистента:</strong></p>
          <p style={{ fontStyle: 'italic' }}>{adviceText}</p>
        </div>
      )}
    </div>
  );
};

export default App;

