import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Wand2 } from 'lucide-react';
import { Skill, BasicAttackSlot, cloneSkill, defaultBasicAttacks } from '../lib/skillSystem';
import { toast } from 'sonner';
import { SkillDetailPanel } from './SkillDetailPanel';
import { SkillTestLab } from './SkillTestLab';
import { SkillBuilder } from './SkillBuilder';

interface SkillWorkspaceProps {
  skills: Record<string, Skill>;
  onSkillsChange: (skills: Record<string, Skill>) => void;
  playerBasicAttack?: BasicAttackSlot;
  monsterBasicAttack?: BasicAttackSlot;
  onPlayerBasicAttackChange?: (slot: BasicAttackSlot) => void;
  onMonsterBasicAttackChange?: (slot: BasicAttackSlot) => void;
}

export function SkillWorkspace({
  skills,
  onSkillsChange,
  playerBasicAttack,
  monsterBasicAttack,
  onPlayerBasicAttackChange,
  onMonsterBasicAttackChange,
}: SkillWorkspaceProps) {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedBasicAttackId, setSelectedBasicAttackId] = useState<string>('meleeBasic');
  const [selectedType, setSelectedType] = useState<'basic' | 'skill'>('basic');
  const [isSkillBuilderOpen, setIsSkillBuilderOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | undefined>(undefined);

  // 선택된 스킬 또는 기본 공격
  const selectedSkill = selectedSkillId ? skills[selectedSkillId] : null;
  const selectedBasicAttack = defaultBasicAttacks[selectedBasicAttackId];

  // 스킬 목록
  const skillList = Object.values(skills);

  // 첫 스킬 자동 선택 (스킬 탭에서만)
  useEffect(() => {
    if (!selectedSkillId && skillList.length > 0) {
      setSelectedSkillId(skillList[0].id);
    }
  }, [skillList.length]);

  // 스킬 생성/수정
  const handleSkillCreate = (skill: Skill) => {
    const newSkills = {
      ...skills,
      [skill.id]: skill,
    };
    onSkillsChange(newSkills);
    setSelectedSkillId(skill.id);
    setIsSkillBuilderOpen(false);
    setEditingSkill(undefined);
    toast.success(`✨ "${skill.name}" 스킬이 ${editingSkill ? '수정' : '생성'}되었습니다!`);
  };

  // 스킬 삭제
  const deleteSkill = (skillId: string) => {
    const { [skillId]: removed, ...remainingSkills } = skills;
    onSkillsChange(remainingSkills);

    // 선택된 스킬이 삭제되면 다른 스킬 선택
    if (selectedSkillId === skillId) {
      const remaining = Object.values(remainingSkills);
      setSelectedSkillId(remaining.length > 0 ? remaining[0].id : null);
    }

    toast.success(`🗑️ "${removed.name}" 스킬이 삭제되었습니다!`);
  };

  // 스킬 복제
  const duplicateSkill = (skill: Skill) => {
    const clonedSkill = cloneSkill(skill);
    const newSkills = {
      ...skills,
      [clonedSkill.id]: clonedSkill,
    };
    onSkillsChange(newSkills);
    setSelectedSkillId(clonedSkill.id);
    toast.success(`📋 "${skill.name}" 스킬이 복제되었습니다!`);
  };

  // 스킬 수정 모드 열기
  const openEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setIsSkillBuilderOpen(true);
  };

  // 스킬 업데이트
  const updateSkill = (skillId: string, updates: Partial<Skill>) => {
    const updatedSkills = {
      ...skills,
      [skillId]: { ...skills[skillId], ...updates },
    };
    onSkillsChange(updatedSkills);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 상단: 스킬 테스트 랩 (100%) */}
      <div style={{ height: '760px' }}>
        <SkillTestLab
          skills={skills}
          playerBasicAttack={playerBasicAttack}
          monsterBasicAttack={monsterBasicAttack}
          selectedSkillId={selectedSkillId}
          selectedBasicAttackId={selectedBasicAttackId}
          selectedType={selectedType}
          onSkillSelect={setSelectedSkillId}
          onBasicAttackSelect={setSelectedBasicAttackId}
          onTypeChange={setSelectedType}
          onAddSkill={() => {
            setEditingSkill(undefined);
            setIsSkillBuilderOpen(true);
          }}
          onEditSkill={openEditSkill}
          onDeleteSkill={deleteSkill}
          onDuplicateSkill={duplicateSkill}
        />
      </div>

      {/* 하단: 스킬 상세 설정 */}
      <div style={{ height: '800px' }} className="min-h-0 overflow-hidden">
        {selectedSkill ? (
          <SkillDetailPanel
            skill={selectedSkill}
            onUpdate={updateSkill}
            onEdit={openEditSkill}
            onDuplicate={duplicateSkill}
            onDelete={deleteSkill}
          />
        ) : (
          <Card className="flex items-center justify-center h-full">
            <div className="text-center text-slate-400">
              <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">스킬을 선택하거나 새로 만들어보세요</p>
            </div>
          </Card>
        )}
      </div>

      {/* 스킬 빌더 다이얼로그 */}
      <SkillBuilder
        open={isSkillBuilderOpen}
        onOpenChange={setIsSkillBuilderOpen}
        onSkillCreate={handleSkillCreate}
        existingSkill={editingSkill}
      />
    </div>
  );
}
