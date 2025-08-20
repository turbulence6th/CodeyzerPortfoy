import React, { useState, useRef, type ReactNode, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { MdArrowDownward as ArrowDownwardIcon } from 'react-icons/md';

const PULL_THRESHOLD = 80; // Yenilemeyi tetiklemek için gereken çekme mesafesi (px)
const ICON_TRANSITION = 'transform 0.3s ease';

interface PullToRefreshProps {
  onRefresh: () => Promise<any>;
  children: ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pulling, setPulling] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Touch Events ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (refreshing || window.scrollY > 0) return;
    setStartY(e.touches[0].clientY);
    setPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    setPullDistance(distance);
  };

  const handleTouchEnd = async () => {
    if (!pulling || refreshing) return;
    finishPulling();
  };
  
  // --- Mouse Events ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (refreshing || window.scrollY > 0) return;
    setStartY(e.clientY);
    setPulling(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!pulling || refreshing) return;
    const currentY = e.clientY;
    const distance = Math.max(0, currentY - startY);
    setPullDistance(distance);
  };

  const handleMouseUp = () => {
    if (!pulling || refreshing) return;
    finishPulling();
  };
  
  // Fare bırakıldığında her yerden yakalamak için global listener
  useEffect(() => {
    if (pulling) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pulling, handleMouseMove, handleMouseUp]);


  const finishPulling = async () => {
    if (pullDistance > PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(0); // Animasyonun geri dönmesi için
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
    setPulling(false);
  };

  const isReadyToRefresh = pullDistance > PULL_THRESHOLD;

  return (
    <Box
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      sx={{ position: 'relative', cursor: refreshing ? 'default' : 'grab' }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50px',
          opacity: pulling || refreshing ? 1 : 0,
          transform: `translateY(${refreshing ? PULL_THRESHOLD : Math.min(pullDistance, PULL_THRESHOLD)}px)`,
          transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
        }}
      >
        {refreshing ? (
          <CircularProgress size={24} />
        ) : (
          <ArrowDownwardIcon
            style={{
              transition: ICON_TRANSITION,
              transform: isReadyToRefresh ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        )}
      </Box>
      {children}
    </Box>
  );
};
