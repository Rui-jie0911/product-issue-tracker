import { useState, useRef, useCallback } from 'react';
import { Button, Modal, Typography, message } from 'antd';
import { AudioOutlined, AudioMutedOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
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

// 错误码中文翻译
const ERROR_MSGS: Record<string, string> = {
  'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许本站使用麦克风',
  'audio-capture': '未检测到麦克风设备',
  'network': '语音服务网络连接失败，请检查网络或尝试用输入法自带的语音输入',
  'service-not-allowed': '当前网络环境不支持语音识别服务',
  'bad-grammar': '语音识别语法错误',
  'language-not-supported': '不支持中文语音识别，请使用 Chrome 浏览器',
};

interface Props {
  fieldValue: string;
  onTextChange: (text: string) => void;
  inputId?: string;
}

export default function VoiceInput({ fieldValue, onTextChange, inputId }: Props) {
  const [recording, setRecording] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [lastError, setLastError] = useState('');
  const baseTextRef = useRef('');
  const finalTextRef = useRef('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;

  const updateInput = (text: string) => {
    onTextChange(text);
    if (inputId) {
      const el = document.getElementById(inputId) as HTMLTextAreaElement | null;
      if (el) {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  const createRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const recognition = new SR();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setRecording(true);
      retryCountRef.current = 0;
    };

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

      if (final) {
        finalTextRef.current += final;
      }

      updateInput(baseTextRef.current + finalTextRef.current + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errCode = event.error;

      // 没检测到语音，尝试自动重启（可能是停顿导致）
      if (errCode === 'no-speech') {
        return; // 静默处理
      }

      // 网络错误或服务不可用，尝试重试
      if ((errCode === 'network' || errCode === 'aborted') && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        // 短暂延迟后重试
        setTimeout(() => {
          try { recognition.start(); } catch { /* 忽略 */ }
        }, 500);
        return;
      }

      setRecording(false);
      const msg = ERROR_MSGS[errCode] || `语音识别出错(${errCode})`;
      setLastError(msg);
      setErrorModalOpen(true);
    };

    recognition.onend = () => {
      setRecording(false);
      // 提交最终文本
      updateInput(baseTextRef.current + finalTextRef.current);
    };

    return recognition;
  }, [updateInput]);

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      message.error('当前浏览器不支持语音识别，请使用 Chrome 浏览器。或使用输入法自带的语音输入功能。');
      return;
    }

    baseTextRef.current = fieldValue;
    finalTextRef.current = '';
    retryCountRef.current = 0;

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      message.error('语音识别启动失败，请刷新页面重试');
    }
  }, [fieldValue, createRecognition]);

  const stopRecording = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch { /* 忽略 */ }
    setRecording(false);
  }, []);

  return (
    <>
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

      <Modal
        title={<span><ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />语音识别提示</span>}
        open={errorModalOpen}
        onCancel={() => setErrorModalOpen(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setErrorModalOpen(false)}>知道了</Button>,
        ]}
        width={360}
      >
        <Text>{lastError}</Text>
        <div style={{ marginTop: 12, padding: 12, background: '#fffbe6', borderRadius: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>备用方案：</strong>如果语音识别持续失败，您可以直接使用手机输入法自带的语音输入功能（搜狗/讯飞/百度输入法都支持），效果通常更好。
          </Text>
        </div>
      </Modal>
    </>
  );
}
