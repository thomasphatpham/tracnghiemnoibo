'use client';

import React, { useEffect, useRef, useState } from 'react';

interface IntroVideoProps {
  onFinished: () => void;
  targetDurationSeconds?: number;
  fadeOutOnFinish?: boolean; // Nếu true: fade-out để lộ trang bên dưới. Nếu false: giữ nguyên lớp che phủ để điều hướng trang mới
}

export default function IntroVideo({
  onFinished,
  targetDurationSeconds = 1.0,
  fadeOutOnFinish = true,
}: IntroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const finishedRef = useRef(false);

  const finishIntro = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    if (fadeOutOnFinish) {
      // Khi ở cùng trang: mờ dần trong 400ms để lộ giao diện bên dưới
      setIsFadingOut(true);
      setTimeout(() => {
        onFinished();
      }, 400);
    } else {
      // Khi chuyển trang (như sau đăng nhập): giữ nguyên lớp phủ 100% không cho lộ trang cũ, gọi onFinished để chuyển ngay
      onFinished();
    }
  };

  const applySpeedAndPlay = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    if (video.duration && video.duration > 0) {
      const calculatedRate = video.duration / targetDurationSeconds;
      video.playbackRate = Math.min(Math.max(calculatedRate, 1), 6);
    }

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        finishIntro();
      });
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    if (video.readyState >= 1) {
      applySpeedAndPlay();
    }

    // Timeout an toàn: tối đa 1.8s nếu video không thể chạy
    const safetyTimer = setTimeout(() => {
      finishIntro();
    }, (targetDurationSeconds + 0.8) * 1000);

    return () => {
      clearTimeout(safetyTimer);
    };
  }, [targetDurationSeconds]);

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-black overflow-hidden flex items-center justify-center transition-opacity ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        willChange: 'opacity',
        transitionDuration: '350ms',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
      }}
    >
      <video
        ref={videoRef}
        src="/3D_logo_reveal_animation_1080p_20261001140330.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={applySpeedAndPlay}
        onCanPlay={applySpeedAndPlay}
        onEnded={finishIntro}
        className="w-screen h-screen object-cover pointer-events-none"
        style={{ transform: 'translateZ(0)' }}
      />
    </div>
  );
}
