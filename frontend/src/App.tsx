import { useEffect, useState, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { initializeAssistant } from './utils/assistant';
import { getCycleDay } from './utils/cycle';
import { getMockLLMAdvice } from './utils/llm';
import './App.css';

export const App = () => {
  const [cycleStartDate, setCycleStartDate] = useState<string | null>(localStorage.getItem('cycleStartDate'));
  const [cycleEndDate, setCycleEndDate] = useState<string | null>(localStorage.getItem('cycleEndDate'));
  const [adviceText, setAdviceText] = useState<string>('');
  const [isAnimatingAdvice, setIsAnimatingAdvice] = useState(false);

  const cycleRef = useRef(cycleStartDate);

  useEffect(() => {
    cycleRef.current = cycleStartDate;
  }, [cycleStartDate]);

  const assistantRef = useRef<ReturnType<typeof initializeAssistant> | null>(null);

  const updateAdviceWithAnimation = (text: string) => {
    setIsAnimatingAdvice(false);
    setTimeout(() => {
      setAdviceText(text);
      setIsAnimatingAdvice(true);
    }, 10);
  };

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
          console.log('Бот просит данные для совета. Цикл начат?');
          if (!cycleRef.current) {
            assistantRef.current?.sendData({
               action: { action_id: 'NO_CYCLE_STARTED' }
            });
          } else {
            const currentDay = getCycleDay(cycleRef.current);
            console.log('Отправляем боту ответ: день', currentDay);
            updateAdviceWithAnimation('Формирую совет...');

            getMockLLMAdvice(currentDay).then(advice => {
              updateAdviceWithAnimation(advice);
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
            updateAdviceWithAnimation(action.parameters.advice);
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
      if (startStr && dateStr === startStr) classes.push('cycle-start');
      if (endStr && dateStr === endStr) classes.push('cycle-end');

      if (cycleStartDate && cycleEndDate) {
        const current = date.getTime();
        const start = new Date(cycleStartDate).getTime();
        const end = new Date(cycleEndDate).getTime();
        if (current > start && current < end) {
          classes.push('cycle-range');
        }
      }
      return classes.join(' ');
    }
    return null;
  };

  const handleManualStart = () => {
    const todayStart = new Date().toISOString();
    setCycleStartDate(todayStart);
    setCycleEndDate(null);
    localStorage.setItem('cycleStartDate', todayStart);
    localStorage.removeItem('cycleEndDate');
  };

  const handleManualEnd = () => {
    const todayEnd = new Date().toISOString();
    setCycleEndDate(todayEnd);
    localStorage.setItem('cycleEndDate', todayEnd);
  };

  const isCycleActive = cycleStartDate && !cycleEndDate;

  return (
    <div className={`app-container ${isCycleActive ? 'bg-cycle' : 'bg-normal'}`}>
      <div id="center">
        <h1>Luna</h1>
        <p className="subtitle">Трекер женского здоровья</p>

        <div className="glass-card">
          <Calendar
            tileClassName={getTileClassName}
            value={cycleStartDate ? new Date(cycleStartDate) : new Date()}
          />
        </div>

        <div className="action-buttons">
          <button className="btn-primary" onClick={handleManualStart}>
            Начать цикл
          </button>
          <button className="btn-secondary" onClick={handleManualEnd} disabled={!cycleStartDate}>
            Завершить цикл
          </button>
        </div>

        {adviceText && (
          <div className="advice-container glass-card" style={{ marginTop: '32px' }}>
            <div className={isAnimatingAdvice ? 'advice-fade-enter-active' : 'advice-fade-enter'}>
              <p style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--accent)' }}>
                Совет от ассистента
              </p>
              <p className="advice-text">{adviceText}</p>
            </div>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '40px', fontSize: '0.9rem', opacity: 0.7 }}>
          <p>
            Статус: {cycleStartDate ? `Цикл начат ${new Date(cycleStartDate).toLocaleDateString()}` : 'Цикл не начат'}
            {cycleEndDate && ` · Завершен ${new Date(cycleEndDate).toLocaleDateString()}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;

