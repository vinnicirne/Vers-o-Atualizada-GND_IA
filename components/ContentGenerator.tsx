<<<<<<< HEAD

=======
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
import React from 'react';
import { CREATOR_SUITE_MODES } from '../constants';
import { ServiceKey } from '../types/plan.types';
import { usePlan } from '../hooks/usePlan';
import { StandardForm } from './tools/StandardForm';
import { VisualForm } from './tools/VisualForm';
import { WebsiteForm } from './tools/WebsiteForm';
<<<<<<< HEAD
import { AudioForm } from './tools/AudioForm';
=======
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
import { CurriculumForm } from './tools/CurriculumForm';

interface ContentGeneratorProps {
  mode: ServiceKey;
  onModeChange: (mode: ServiceKey) => void;
  onGenerate: (
    prompt: string, 
    mode: ServiceKey, 
    generateAudio: boolean,
    options?: any
  ) => void;
  isLoading: boolean;
  isGuest?: boolean;
  guestAllowedModes?: ServiceKey[];
}

export function ContentGenerator({ mode, onGenerate, isLoading, isGuest = false, guestAllowedModes = [] }: ContentGeneratorProps) {
  const { hasAccessToService } = usePlan();

  const isModeLocked = (modeValue: ServiceKey) => {
      if (isGuest) {
          return !guestAllowedModes.includes(modeValue);
      }
      return !hasAccessToService(modeValue);
  };

  const isLocked = isModeLocked(mode);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <div className="mb-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-[var(--brand-secondary)]">
              {CREATOR_SUITE_MODES.find(m => m.value === mode)?.label}
          </h2>
          <p className="text-sm text-gray-500">Preencha os detalhes abaixo para gerar seu conteúdo.</p>
      </div>

<<<<<<< HEAD
      {/* Roteador de Formulários */}
=======
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
      {mode === 'landingpage_generator' ? (
          <WebsiteForm mode={mode} onGenerate={onGenerate} isLoading={isLoading} isLocked={isLocked} />
      ) : (mode === 'image_generation' || mode === 'social_media_poster') ? (
          <VisualForm mode={mode} onGenerate={onGenerate} isLoading={isLoading} isLocked={isLocked} />
<<<<<<< HEAD
      ) : mode === 'text_to_speech' ? (
          <AudioForm mode={mode} onGenerate={onGenerate} isLoading={isLoading} isLocked={isLocked} />
=======
>>>>>>> 838df02e050608b556d51e29ad6aa6c7dd11052d
      ) : mode === 'curriculum_generator' ? (
          <CurriculumForm mode={mode} onGenerate={onGenerate} isLoading={isLoading} isLocked={isLocked} />
      ) : (
          <StandardForm 
            mode={mode} 
            onGenerate={onGenerate} 
            isLoading={isLoading} 
            isLocked={isLocked} 
            isGuest={isGuest}
            hasAccessToService={hasAccessToService}
          />
      )}
    </div>
  );
}