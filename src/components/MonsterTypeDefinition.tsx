import React from 'react';

export interface MonsterTypeStats {
  id: string;
  name: string;
  level: number;
}

export const MonsterTypeDefinition: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Monster Type Definition</h2>
      <p>Monster type definition component</p>
    </div>
  );
};
