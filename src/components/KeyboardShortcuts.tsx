import React, { useEffect } from 'react';
import { useLightingStore } from '../stores/lightingStore';

export const KeyboardShortcuts: React.FC = () => {
  const { 
    selectFixture,
    selectAllFixtures, 
    clearSelection,
    updateDimmer,
    selectedFixtures,
    fixtures
  } = useLightingStore();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      const key = event.key.toLowerCase();
      
      // Number keys 1-6 for fixture selection
      if (['1', '2', '3', '4', '5', '6'].includes(key)) {
        const fixtureId = parseInt(key);
        if (event.shiftKey || event.ctrlKey) {
          // Multi-selection mode
          selectFixture(fixtureId, true);
        } else {
          // Single selection
          selectFixture(fixtureId, false);
        }
        event.preventDefault();
        return;
      }

      // 'a' for select all
      if (key === 'a' && event.ctrlKey) {
        selectAllFixtures();
        event.preventDefault();
        return;
      }

      // Escape to clear selection
      if (key === 'escape') {
        clearSelection();
        event.preventDefault();
        return;
      }

      // Space for 100% dimmer on selected
      if (key === ' ' && selectedFixtures.length > 0) {
        updateDimmer(selectedFixtures, 100);
        event.preventDefault();
        return;
      }

      // 'b' for blackout selected fixtures
      if (key === 'b' && selectedFixtures.length > 0) {
        updateDimmer(selectedFixtures, 0);
        event.preventDefault();
        return;
      }

      // Number keys with Ctrl for preset recall (0-9)
      if (event.ctrlKey && ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
        // Future: implement preset recall
        console.log(`Preset ${key} recall - not implemented yet`);
        event.preventDefault();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedFixtures, selectFixture, selectAllFixtures, clearSelection, updateDimmer]);

  return null; // This component only handles keyboard events
};