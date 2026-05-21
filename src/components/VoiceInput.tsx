import { useState, useRef, useCallback } from 'react';
import { Button, message } from 'antd';
import { AudioOutlined, AudioMutedOutlined } from '@ant-design/icons';

// Web Speech API 类型声明
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface Props {
  value: string;
  onChange: (text: string) => void;
}

export default function VoiceInput({ value, onChange }: Props) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(() => {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  });
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      message.error('当前浏览器不支持语音识别，请使用 Chrome 浏览器');
      setSupported(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      const newText = value + final + interim;
      onChange(newText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      message.error(`语音识别错误: ${event.error}`);
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    message.info('正在录音，请说中文...');
  }, [value, onChange]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setRecording(false);
  }, []);

  if (!supported) return null;

  return (
    <Button
      type={recording ? 'primary' : 'default'}
      danger={recording}
      icon={recording ? <AudioMutedOutlined /> : <AudioOutlined />}
      onClick={recording ? stopRecording : startRecording}
      className={recording ? 'voice-recording' : ''}
      style={{ borderRadius: 20 }}
    >
      {recording ? '停止录音' : '语音输入'}
    </Button>
  );
}
