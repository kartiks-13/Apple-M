/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Music, 
  Plus, 
  ListMusic, 
  Disc,
  X
} from 'lucide-react';
import { Track, PlayerState } from './types.ts';
import * as mm from 'music-metadata-browser';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentTrackIndex: null,
    isPlaying: false,
    volume: 0.8,
    currentTime: 0,
    duration: 0
  });
  const [showPlaylist, setShowPlaylist] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentTrack = playerState.currentTrackIndex !== null ? tracks[playerState.currentTrackIndex] : null;

  const [isDragging, setIsDragging] = useState(false);

  // Handle Android Back Button
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (showPlaylist) {
          setShowPlaylist(false);
        } else if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
    }
  }, [showPlaylist]);

  // Handle Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files) as File[];
    processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    for (const file of files) {
      if (!file.type.startsWith('audio/')) continue;

      try {
        const metadata = await mm.parseBlob(file);
        const { title, artist, album, picture } = metadata.common;
        let coverUrl = '';
        
        if (picture && picture.length > 0) {
          const pic = picture[0];
          const blob = new Blob([pic.data], { type: pic.format });
          coverUrl = URL.createObjectURL(blob);
        }

        const newTrack: Track = {
          id: Math.random().toString(36).substr(2, 9),
          file: file,
          title: title || file.name.replace(/\.[^/.]+$/, ""),
          artist: artist || "Unknown Artist",
          album: album || "Unknown Album",
          duration: metadata.format.duration || 0,
          coverUrl
        };

        setTracks(prev => [...prev, newTrack]);
      } catch (error) {
        console.error("Error reading metadata:", error);
        const newTrack: Track = {
          id: Math.random().toString(36).substr(2, 9),
          file: file,
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: "Unknown Artist",
          album: "Unknown Album",
          duration: 0,
        };
        setTracks(prev => [...prev, newTrack]);
      }
    }
  };

  // Update handleFileSelect to use processFiles
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    processFiles(files);
  };

  // Playback control
  const togglePlay = () => {
    if (!audioRef.current || playerState.currentTrackIndex === null) return;
    
    if (playerState.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const playTrack = (index: number) => {
    setPlayerState(prev => ({ ...prev, currentTrackIndex: index, isPlaying: true }));
  };

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const nextIndex = (playerState.currentTrackIndex! + 1) % tracks.length;
    playTrack(nextIndex);
  }, [tracks.length, playerState.currentTrackIndex]);

  const prevTrack = () => {
    if (tracks.length === 0) return;
    const prevIndex = (playerState.currentTrackIndex! - 1 + tracks.length) % tracks.length;
    playTrack(prevIndex);
  };

  // Audio effects
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      const url = URL.createObjectURL(currentTrack.file);
      audioRef.current.src = url;
      audioRef.current.play();
      
      return () => URL.revokeObjectURL(url);
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = playerState.volume;
    }
  }, [playerState.volume]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 transition-all duration-500 ${
        isDragging ? 'scale-[0.98] bg-white/5' : ''
      }`}
    >
      {/* Immersive Background */}
      <div className={`atmosphere ${playerState.isPlaying ? 'scale-110' : 'scale-100'}`} />
      
      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none"
          >
            <div className="flex flex-col items-center gap-4 text-white/80">
              <Plus className="w-16 h-16 animate-bounce" />
              <p className="text-2xl font-bold tracking-widest uppercase">Drop to add music</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Player UI */}
      <main className="relative z-10 w-full max-w-4xl h-full flex flex-col md:flex-row gap-8 items-center justify-center">
        
        {/* Left Side: Album Art & Info */}
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <motion.div 
            key={currentTrack?.id || 'empty'}
            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="relative w-64 h-64 md:w-96 md:h-96 rounded-3xl overflow-hidden shadow-2xl glass"
          >
            {currentTrack?.coverUrl ? (
              <img 
                src={currentTrack.coverUrl} 
                alt={currentTrack.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/5">
                <Disc className="w-32 h-32 text-white/20 animate-spin-slow" />
              </div>
            )}
          </motion.div>

          <div className="space-y-2">
            <motion.h1 
              key={currentTrack?.title || 'No Track'}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl md:text-5xl font-bold tracking-tight"
            >
              {currentTrack?.title || "Select a Track"}
            </motion.h1>
            <motion.p 
              key={currentTrack?.artist || '...'}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 0.6 }}
              className="text-lg md:text-xl font-medium italic text-white/60"
            >
              {currentTrack?.artist || "Add your local music to start"}
            </motion.p>
          </div>
        </div>

        {/* Right Side: Controls & Playlist */}
        <div className="w-full md:w-96 flex flex-col gap-6">
          
          {/* Progress Bar */}
          <div className="glass p-6 rounded-3xl space-y-4">
            <div className="flex justify-between text-xs font-mono text-white/40 uppercase tracking-widest">
              <span>{formatTime(playerState.currentTime)}</span>
              <span>{formatTime(playerState.duration)}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max={playerState.duration || 0} 
              value={playerState.currentTime}
              onChange={(e) => {
                const time = parseFloat(e.target.value);
                if (audioRef.current) audioRef.current.currentTime = time;
              }}
              className="w-full cursor-pointer"
            />
            
            {/* Playback Controls */}
            <div className="flex items-center justify-between pt-2">
              <button onClick={prevTrack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <SkipBack className="w-6 h-6" />
              </button>
              
              <button 
                onClick={togglePlay}
                className="w-16 h-16 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform active:scale-95"
              >
                {playerState.isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </button>
              
              <button onClick={nextTrack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <SkipForward className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Volume & Actions */}
          <div className="flex items-center gap-4 px-2">
            <div className="flex-1 flex items-center gap-3 glass px-4 py-3 rounded-2xl">
              {playerState.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={playerState.volume}
                onChange={(e) => setPlayerState(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                className="flex-1"
              />
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-4 glass rounded-2xl hover:bg-white/10 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowPlaylist(true)}
              className="p-4 glass rounded-2xl hover:bg-white/10 transition-colors relative"
            >
              <ListMusic className="w-5 h-5" />
              {tracks.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff4e00] text-[10px] flex items-center justify-center rounded-full font-bold">
                  {tracks.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Playlist Overlay */}
      <AnimatePresence>
        {showPlaylist && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-y-0 right-0 w-full md:w-96 glass z-50 p-8 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Playlist</h2>
              <button onClick={() => setShowPlaylist(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 track-scroll-fade space-y-4">
              {tracks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <Music className="w-16 h-16" />
                  <p>No tracks added yet.<br/>Click the + button to add files.</p>
                </div>
              ) : (
                tracks.map((track, index) => (
                  <motion.div 
                    key={track.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      playTrack(index);
                      setShowPlaylist(false);
                    }}
                    className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${
                      playerState.currentTrackIndex === index ? 'bg-white/20' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                      {track.coverUrl ? (
                        <img src={track.coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-5 h-5 opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{track.title}</h3>
                      <p className="text-sm text-white/40 truncate">{track.artist}</p>
                    </div>
                    {playerState.currentTrackIndex === index && playerState.isPlaying && (
                      <div className="flex gap-1 items-end h-4">
                        <motion.div animate={{ height: [4, 16, 8, 16, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-[#ff4e00]" />
                        <motion.div animate={{ height: [8, 4, 16, 4, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-[#ff4e00]" />
                        <motion.div animate={{ height: [16, 8, 4, 8, 16] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-[#ff4e00]" />
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef}
        onTimeUpdate={() => setPlayerState(prev => ({ ...prev, currentTime: audioRef.current?.currentTime || 0 }))}
        onLoadedMetadata={() => setPlayerState(prev => ({ ...prev, duration: audioRef.current?.duration || 0 }))}
        onEnded={nextTrack}
      />

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        multiple 
        accept="audio/*" 
        className="hidden" 
      />

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
}
