import {
  createAssistant,
  createSmartappDebugger,
} from '@salutejs/client';

export const initializeAssistant = (getState: () => any) => {
  // Для локальной отладки используем createSmartappDebugger
  if (import.meta.env.MODE === 'development') {
    return createSmartappDebugger({
      token: import.meta.env.VITE_SMARTAPP_TOKEN || '',
      initPhrase: `Запусти ${import.meta.env.VITE_SMARTAPP_NAME || 'смартапп'}`,
      getState,
      nativePanel: {
        defaultText: 'Говорите!',
        screenshotMode: false,
        tabIndex: -1,
      },
    });
  }

  // На бою: инициализация стандартного клиента
  return createAssistant({ getState });
};
