import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MajorMode } from './modes/majorMode';
import { PentatonicMode } from './modes/pentatonicMode';
import { KeyAndModeControlMode } from './modes/keyAndModeControlMode'
import { ModeBase } from './modes/modeBase';
import { Box } from './box';

function randomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 90% 70%)`;
}

const trackSections = [
  { label: 'Melody', color: '#0f3d1f' },
  { label: 'Harmony', color: '#5c4a00' },
  { label: 'Bass', color: '#7a3300' },
  { label: 'Rhythm', color: '#0f2c4e' },
];

function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [currentKey] = useState('C4');
  const [compositionMode, setCompositionMode] = useState<string>(MajorMode.name);
  const [activeBoxId, setActiveBoxId] = useState<number | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trashRef = useRef<HTMLDivElement | null>(null);
  const boxesRef = useRef(boxes);
  const lastPlayheadXRef = useRef<number | null>(null);
  const didDragRef = useRef(false);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const updateContainerHeight = () => {
      setContainerHeight(containerRef.current?.clientHeight ?? 0);
    };

    updateContainerHeight();
    window.addEventListener('resize', updateContainerHeight);

    return () => {
      window.removeEventListener('resize', updateContainerHeight);
    };
  }, []);

  const playModes = [MajorMode, PentatonicMode, KeyAndModeControlMode] as const;

  const playModeMap = useMemo(() => {
    return playModes.reduce<Record<string, ModeBase>>((acc, Mode) => {
      acc[Mode.name] = new Mode(containerHeight);
      return acc;
    }, {});
  }, [containerHeight]);

  useEffect(() => {
    return () => {
      Object.values(playModeMap).forEach((mode) => mode.dispose());
    };
  }, [playModeMap]);

  const handlePlayEvent = useCallback(
    async (box: Box) => {
      await playModeMap[compositionMode].play(box, boxes);
    },
    [compositionMode, playModeMap, boxes]
  );

  const addBox = useCallback((x: number, y: number) => {
    const newBox: Box = {
      id: Date.now(),
      x,
      y,
      color: randomColor(),
      stackHeight: 1,
    };

    setBoxes((prev) => [...prev, newBox]);
    return newBox;
  }, []);

  const handleContainerDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - 25;
    const y = event.clientY - rect.top - 25;
    const newBox = addBox(x, y);
    setActiveBoxId(newBox.id);
    handlePlayEvent(newBox);
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

    const trashRect = trashRef.current?.getBoundingClientRect();
    const overTrash = Boolean(
      trashRect && event.clientX >= trashRect.left && event.clientX <= trashRect.right && event.clientY >= trashRect.top && event.clientY <= trashRect.bottom
    );
    setIsOverTrash(overTrash);
  };

  const stopDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (event?.currentTarget) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (draggingId !== null && event && trashRef.current) {
      const trashRect = trashRef.current.getBoundingClientRect();
      const overTrash =
        event.clientX >= trashRect.left && event.clientX <= trashRect.right && event.clientY >= trashRect.top && event.clientY <= trashRect.bottom;

      if (overTrash) {
        setBoxes((prev) => prev.filter((box) => box.id !== draggingId));
      }
    }

    setIsOverTrash(false);
    setDraggingId(null);
  };

  const handleBoxClick = (event: React.MouseEvent<HTMLDivElement>, boxId: number) => {
    event.stopPropagation();
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    setBoxes((prev) => prev.map((box) => (box.id === boxId ? { ...box, stackHeight: (box.stackHeight % 8) + 1 } : box)));
  };

  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);

  useEffect(() => {
    if (activeBoxId === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveBoxId(null);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [activeBoxId]);

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
            setActiveBoxId(box.id);
            void handlePlayEvent(box);
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
  }, [currentKey, handlePlayEvent]);

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
      <div className="composition-controls" role="group" aria-label="Composition mode">
        {Object.entries(playModeMap).map(([modeName]) => (
          <button
            key={modeName}
            type="button"
            className={`composition-mode-button${compositionMode === modeName ? ' is-active' : ''}`}
            onClick={() => setCompositionMode(modeName)}
          >
            {modeName.slice(0, -4)}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="container" style={containerStyle} onDoubleClick={handleContainerDoubleClick}>
        <div className="track-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {trackSections.map((track, index) => (
            <div
              key={track.label}
              className="track-section"
              style={{
                top: `${index * 25}%`,  
                height: '25%',
                background: track.color,
              }}
            >
              <span className="track-label">{track.label}</span>
            </div>
          ))}
        </div>
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
            zIndex: 2,
          }}
        />
        {boxes.map((box) => (
          <div
            key={box.id}
            className={`box${activeBoxId === box.id ? ' is-playing' : ''}`}
            style={{
              position: 'absolute',
              left: box.x,
              top: box.y,
              width: 50,
              height: 50,
              ['--box-color' as string]: box.color,
              background: 'var(--box-color)',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#111111',
              fontWeight: 800,
              fontSize: 22,
              userSelect: 'none',
              textShadow: '0 0 2px rgba(255,255,255,0.55)',
              zIndex: 1,
            }}
            onPointerDown={(event) => beginDrag(event, box)}
            onClick={(event) => handleBoxClick(event, box.id)}
            onDoubleClick={(event) => event.stopPropagation()}
            onPointerMove={handleDrag}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
          >
            {box.stackHeight}
          </div>
        ))}
      </div>
      <div ref={trashRef} className={`trash-zone${isOverTrash ? ' is-active' : ''}`}>
        <span className="trash-icon" aria-hidden="true">
          🗑️
        </span>
      </div>
    </div>
  );
}

export default App;
