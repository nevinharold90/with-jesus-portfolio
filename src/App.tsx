import React from 'react';
import { HeroOverlay } from './components/HeroOverlay';

export default function App() {
  return (
    <div className="relative w-full min-h-screen bg-transparent text-stone-100 font-sans antialiased overflow-x-hidden">
      <main className="relative z-10">
        <HeroOverlay />
      </main>
    </div>
  );
}