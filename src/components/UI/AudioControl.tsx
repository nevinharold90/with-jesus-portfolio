import React, { useState, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function AudioControl() {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const toggleAudio = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.volume = 0.25; // Gentle background volume (25%)
            audioRef.current.play().catch(() => {
                console.warn('Playback blocked by browser user-interaction policy.');
        });
            setIsPlaying(true);
        }
    };

    return (
        <div className="fixed top-6 right-6 z-50">
            {/* Hidden Audio Tag — replace src with your actual audio track path */}
            <audio ref={audioRef} src="/audio/ambient-bgm.mp3" loop />
            <button
                onClick={toggleAudio}
                aria-label={isPlaying ? 'Mute background music' : 'Play background music'}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-stone-700/50 backdrop-blur-md transition-all duration-300 shadow-lg group cursor-pointer"
            >
                {isPlaying ? (
                <>
                    <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-xs font-medium tracking-wide">Sound On</span>
                </>
                ) : (
                <>
                    <VolumeX className="w-4 h-4 text-stone-400 group-hover:text-amber-400 transition-colors" />
                    <span className="text-xs font-medium tracking-wide text-stone-400 group-hover:text-stone-200">
                    Sound Off
                    </span>
                </>
                )}
            </button>
        </div>
    );
}