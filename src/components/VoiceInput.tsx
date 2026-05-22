import { useState, useRef, useCallback } from 'react';
import { Button, message } from 'antd';
import { AudioOutlined, AudioMutedOutlined } from '@ant-design/icons';

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
  // 当前输入框的已有文本（录音开始时以此为起点追加）
  fieldValue: string;
  // 文本变化时回调（实时更新）
  onTextChange: (text: string) => void;
  // 给 TextArea 设置值的函数（因为 antd Form 的 TextArea 需要通过原生 DOM 方式更新才能显示）
  inputId?: string;
}

export default function VoiceInput({ fieldValue, onTextChange, inputId }: Props) {
  const [recording, setRecording] = useState(false);
  const baseTextRef = useRef('');       // 录音开始时的已有文本
  const finalTextRef = useRef('');      // 本次录音已确认的文本
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      message.error('当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器');
      return;
    }

    // 记录开始时的文本作为基底
    baseTextRef.current = fieldValue;
    finalTextRef.current = '';

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

      // 累积已确认的文本
      if (final) {
        finalTextRef.current += final;
      }

      // 实时拼接：基底 + 已确认 + 临时
      const fullText = baseTextRef.current + finalTextRef.current + interim;
      onTextChange(fullText);

      // 同步更新 DOM 输入框（antd TextArea 不受控时需要）
      if (inputId) {
        const el = document.getElementById(inputId) as HTMLTextAreaElement | null;
        if (el) {
          el.value = fullText;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        // 没有检测到语音，静默处理，不报错
      } else {
        message.error(`语音识别出错: ${event.error}`);
      }
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
      // 录音结束时，把最终文本写入
      const finalText = baseTextRef.current + finalTextRef.current;
      onTextChange(finalText);
      if (inputId) {
        const el = document.getElementById(inputId) as HTMLTextAreaElement | null;
        if (el) {
          el.value = finalText;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }, [fieldValue, onTextChange, inputId]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setRecording(false);
  }, []);

  return (
    <Button
      type={recording ? 'primary' : 'default'}
      danger={recording}
      icon={recording ? <AudioMutedOutlined /> : <AudioOutlined />}
      onClick={recording ? stopRecording : startRecording}
      className={recording ? 'voice-recording' : ''}
      style={{ borderRadius: 20 }}
    >
      {recording ? '停止' : '语音输入'}
    </Button>
  );
}
