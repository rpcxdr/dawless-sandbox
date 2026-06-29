import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';

type Box = {
  id: number;
  x: number;
  y: number;
  color: string;
  stackHeight: number;
};

function randomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 90% 70%)`;
}

function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [currentKey] = useState('C4');
  const offsetRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boxesRef = useRef(boxes);
  const lastPlayheadXRef = useRef<number | null>(null);
  const didDragRef = useRef(false);

  const playCQuarterNote = useCallback(async () => {
    await Tone.start();
    const synth = new Tone.Synth().toDestination();
    synth.triggerAttackRelease('C4', '4n');
  }, []);

  const playNodeInKey = useCallback(async (key: string, stackHeight: number) => {
    await Tone.start();
    const synth = new Tone.Synth().toDestination();
    const baseMidi = Tone.Frequency(key).toMidi();
    const scaleDegrees = [0, 2, 4, 5, 7, 9, 11];
    const degreeOffset = Math.max(stackHeight - 1, 0);
    const semitoneOffset = scaleDegrees[degreeOffset % 7] + Math.floor(degreeOffset / 7) * 12;
    const targetNote = Tone.Frequency(baseMidi + semitoneOffset, 'midi').toNote();
    synth.triggerAttackRelease(targetNote, '8n');
  }, []);

  const addBox = useCallback((x: number, y: number) => {
    setBoxes((prev) => [
      ...prev,
      {
        id: Date.now(),
        x,
        y,
        color: randomColor(),
        stackHeight: 1,
      },
    ]);
  }, []);

  const handleContainerDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - 25;
    const y = event.clientY - rect.top - 25;
    addBox(x, y);
    playCQuarterNote();
  };

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>, box: Box) => {
    event.stopPropagation();
    didDragRef.current = false;
    const rect = event.currentTarget.getBoundingClientRect();
    setDraggingId(box.id);
    offsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggingId === null || !containerRef.current) {
      return;
    }

    didDragRef.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - offsetRef.current.x;
    const y = event.clientY - rect.top - offsetRef.current.y;

    setBoxes((prev) =>
      prev.map((box) => (box.id === draggingId ? { ...box, x: Math.max(0, Math.min(rect.width - 50, x)), y: Math.max(0, Math.min(rect.height - 50, y)) } : box))
    );
  };

  const stopDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (event?.currentTarget) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
  };

  const handleBoxClick = (boxId: number) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    setBoxes((prev) => prev.map((box) => (box.id === boxId ? { ...box, stackHeight: (box.stackHeight % 8) + 1 } : box)));
  };

  const handleBoxDoubleClick = (event: React.MouseEvent<HTMLDivElement>, boxId: number) => {
    event.stopPropagation();
    setBoxes((prev) => prev.filter((box) => box.id !== boxId));
  };

  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);

  useEffect(() => {
    let frameId = 0;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const duration = 8000;
      const progress = (elapsed % duration) / duration;
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      const playheadX = containerWidth > 0 ? progress * containerWidth : 0;

      if (lastPlayheadXRef.current !== null) {
        boxesRef.current.forEach((box) => {
          if (lastPlayheadXRef.current! < box.x && playheadX >= box.x) {
            void playNodeInKey(currentKey, box.stackHeight);
          }
        });
      }

      lastPlayheadXRef.current = playheadX;
      setPlayheadPosition(progress * 100);
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [currentKey, playNodeInKey]);

  const containerStyle = useMemo(
    () => ({
      width: '100%',
      maxWidth: '900px',
      height: '70vh',
      border: '2px solid #4b5563',
      borderRadius: '16px',
      position: 'relative' as const,
      background: 'linear-gradient(135deg, #111827, #1f2937)',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    }),
    []
  );

  return (
    <div className="app">
      <div ref={containerRef} className="container" style={containerStyle} onDoubleClick={handleContainerDoubleClick}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${playheadPosition}%`,
            width: 1,
            height: '100%',
            background: 'green',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
        />
        {boxes.map((box) => (
          <div
            key={box.id}
            className="box"
            style={{
              position: 'absolute',
              left: box.x,
              top: box.y,
              width: 50,
              height: 50,
              background: box.color,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#111111',
              fontWeight: 800,
              fontSize: 22,
              userSelect: 'none',
              textShadow: '0 0 2px rgba(255,255,255,0.55)',
            }}
            onPointerDown={(event) => beginDrag(event, box)}
            onClick={() => handleBoxClick(box.id)}
            onDoubleClick={(event) => handleBoxDoubleClick(event, box.id)}
            onPointerMove={handleDrag}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
          >
            {box.stackHeight}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
