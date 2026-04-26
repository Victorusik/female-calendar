import React, { useEffect, useState, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { initializeAssistant } from './utils/assistant';
import { getCycleDay } from './utils/cycle';
import { getMockLLMAdvice } from './utils/llm';
import './App.css'; // Make sure styles are applied

export const App = () => {
  const [cycleStartDate, setCycleStartDate] = useState<string | null>(localStorage.getItem('cycleStartDate'));
  const [cycleEndDate, setCycleEndDate] = useState<string | null>(localStorage.getItem('cycleEndDate'));
  const [adviceText, setAdviceText] = useState<string>('');

  const cycleRef = useRef(cycleStartDate);

  useEffect(() => {
    cycleRef.current = cycleStartDate;
  }, [cycleStartDate]);

  const assistantRef = useRef<ReturnType<typeof initializeAssistant> | null>(null);

  useEffect(() => {
    assistantRef.current = initializeAssistant(() => ({
      app_info: {
        applicationId: 'mock-app-id',
        appversionId: '1.0.0'
      },
      item_selector: {
        items: []
      }
    }));

    assistantRef.current.on('data', (cmd: any) => {
      console.log('====== ВХОДЯЩАЯ КОМАНДА ОТ БОТА ======', cmd);

      let action: any = null;
      if (cmd?.type === 'smart_app_data') {
         action = cmd.smart_app_data;
      } else if (cmd?.type === 'character') {
         console.log('Поменялся персонаж бота');
      } else {
         action = cmd?.action || cmd?.smart_app_data || cmd;
      }

      if (!action || !action.type) {
         console.log('Не найден понятный action в команде');
         return;
      }

      console.log('=== РАСПОЗНАН ACTION: ===', action.type);

      switch (action.type) {
        case 'START_CYCLE': {
          console.log('Бот прислал команду начать цикл');
          const todayStart = new Date().toISOString();
          setCycleStartDate(todayStart);
          setCycleEndDate(null);
          localStorage.setItem('cycleStartDate', todayStart);
          localStorage.removeItem('cycleEndDate');
          break;
        }
        case 'END_CYCLE': {
          console.log('Бот прислал команду закончить цикл');
          const todayEnd = new Date().toISOString();
          setCycleEndDate(todayEnd);
          localStorage.setItem('cycleEndDate', todayEnd);
          break;
        }
        case 'GET_ADVICE_REQUESTED': {
          console.log('Бот просит данные для совета. Цикл начат?', !!cycleRef.current);
          if (!cycleRef.current) {
            assistantRef.current?.sendData({
               action: { action_id: 'NO_CYCLE_STARTED' }
            });
          } else {
            const currentDay = getCycleDay(cycleRef.current);
            console.log('Отправляем боту ответ: день', currentDay);
            setAdviceText('Формирую совет...');

            // Обращаемся к нашей заглушке напрямую на фронте
            getMockLLMAdvice(currentDay).then(advice => {
              setAdviceText(advice);
              // Отправляем готовый совет обратно ассистенту, чтобы он его озвучил
              assistantRef.current?.sendData({
                 action: { action_id: 'ADVICE_READY', parameters: { advice: advice } }
              });
            });
          }
          break;
        }
        case 'SHOW_ADVICE': {
          console.log('Бот прислал готовый совет от LLM:', action.parameters?.advice);
          if (action.parameters?.advice) {
            setAdviceText(action.parameters.advice);
          }
          break;
        }
        default:
          console.log('Неизвестный тип action:', action.type);
          break;
      }
    });

    return () => {
      assistantRef.current = null;
    };
  }, []);

  const getTileClassName = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const dateStr = date.toDateString();
      const startStr = cycleStartDate ? new Date(cycleStartDate).toDateString() : null;
      const endStr = cycleEndDate ? new Date(cycleEndDate).toDateString() : null;

      const classes = [];
      if (startStr && dateStr === startStr) classes.push('cycle-start-date');
      if (endStr && dateStr === endStr) classes.push('cycle-end-date');

      // Highlight the range
      if (cycleStartDate && cycleEndDate) {
        const current = date.getTime();
        const start = new Date(cycleStartDate).getTime();
        const end = new Date(cycleEndDate).getTime();
        if (current > start && current < end) {
          classes.push('cycle-in-range');
        }
      }
      return classes.join(' ');
    }
    return null;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Женский календарь</h1>
      <p style={{ fontSize: '18px' }}>
        <strong>Старт текущего цикла:</strong> {cycleStartDate ? new Date(cycleStartDate).toLocaleDateString() : 'Не отмечено'}
      </p>
      {cycleEndDate && (
        <p style={{ fontSize: '18px' }}>
          <strong>Конец текущего цикла:</strong> {new Date(cycleEndDate).toLocaleDateString()}
        </p>
      )}

      <div style={{ marginTop: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
        <Calendar
          tileClassName={getTileClassName}
          value={cycleStartDate ? new Date(cycleStartDate) : new Date()}
        />
      </div>

      <style>{`
        .cycle-start-date { background: #ff7675 !important; color: white !important; border-radius: 8px; }
        .cycle-end-date { background: #d63031 !important; color: white !important; border-radius: 8px; }
        .cycle-in-range { background: #ffeaa7 !important; border-radius: 8px; }
      `}</style>

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

