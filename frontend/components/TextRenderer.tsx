import React from 'react';

interface TextRendererProps {
  text: string;
}

export const TextRenderer: React.FC<TextRendererProps> = ({ text }) => {
  if (!text) return null;

  // Split by [[UNREADABLE]]
  const parts = text.split('[[UNREADABLE]]');

  return (
    <div className="whitespace-pre-wrap leading-relaxed text-lg font-serif">
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <span className="inline-flex items-center px-2 py-0.5 mx-1 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 select-none">
              [לא ברור]
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
