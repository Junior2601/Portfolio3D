import { useRef } from 'react';
import { useStudio } from '../store.js';

export default function Toast() {
  const toast = useStudio((s) => s.toast);
  const last = useRef('');
  if (toast) last.current = toast.msg; // garde le texte pendant la disparition
  return <div id="toast" role="status" className={toast ? 'show' : ''}>{last.current}</div>;
}
