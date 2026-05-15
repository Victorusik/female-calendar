import {
  createAssistant,
  createSmartappDebugger,
} from '@salutejs/client';

let assistantInstance: any = null;

export const initializeAssistant = (getState: () => any) => {
  if (assistantInstance) {
    return assistantInstance;
  }

  // Для локальной отладки используем createSmartappDebugger
  if (import.meta.env.MODE === 'development') {
    assistantInstance = createSmartappDebugger({
      token: import.meta.env.VITE_SMARTAPP_TOKEN || '',
      initPhrase: `Запусти ${import.meta.env.VITE_SMARTAPP_NAME || 'смартапп'}`,
      getState,
      nativePanel: {
        defaultText: 'Говорите!',
        screenshotMode: false,
        tabIndex: -1,
        hideNativePanel: false,
      },
    });
    return assistantInstance;
  }

  // На бою: инициализация стандартного клиента
  assistantInstance = createAssistant({ getState });
  return assistantInstance;
};
