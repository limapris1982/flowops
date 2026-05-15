import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';

const SignaturePad = ({ onSave, onClear, signatureRef }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2F2F2F';
  };

  useEffect(() => {
    setTimeout(initCanvas, 100);
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, []);

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);

    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;

    setIsDrawing(false);

    const canvas = canvasRef.current;
    canvas.releasePointerCapture(e.pointerId);

    if (onSave) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (onClear) onClear();
    if (onSave) onSave(null);
  };

  useEffect(() => {
    if (signatureRef) {
      signatureRef.current = {
        clear: clearCanvas
      };
    }
  }, [signatureRef]);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="border border-zinc-300 rounded-lg overflow-hidden w-full max-w-lg bg-zinc-50 touch-none shadow-sm">
        <canvas
          ref={canvasRef}
          className="w-full h-48 cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
        />
      </div>

      <button
        type="button"
        onClick={clearCanvas}
        className="mt-2 text-sm text-zinc-500 hover:text-red-500 flex items-center transition-colors font-medium"
      >
        <X size={16} className="mr-1" />
        Limpar Assinatura
      </button>
    </div>
  );
};

export default SignaturePad;