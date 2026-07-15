import { expect, it, vi } from 'vitest';
import { openDistrictModal } from '../../../src/features/board/district-modal.js';

function setup(selectedDistrict = '마포구') {
  const trigger = document.body.appendChild(document.createElement('button'));
  const onApply = vi.fn();
  const onClear = vi.fn();
  trigger.focus();
  const result = openDistrictModal({ selectedDistrict, trigger, onApply, onClear });
  return { ...result, trigger, onApply, onClear };
}

it('서울 25개 구와 현재 선택을 표시한다', () => {
  setup();
  expect(document.querySelectorAll('[data-district-option]')).toHaveLength(25);
  expect(document.querySelector('[data-district-option="마포구"]').getAttribute('aria-pressed')).toBe('true');
});

it('임시 선택을 적용할 때만 콜백을 호출한다', () => {
  const { onApply } = setup();
  document.querySelector('[data-district-option="중구"]').click();
  expect(onApply).not.toHaveBeenCalled();
  expect(document.querySelector('[data-district-option="중구"]').getAttribute('aria-pressed')).toBe('true');
  document.querySelector('[data-apply-district]').click();
  expect(onApply).toHaveBeenCalledWith('중구');
  expect(document.querySelector('dialog')).toBeNull();
});

it('전체 보기로 지역 필터를 해제한다', () => {
  const { onClear } = setup();
  document.querySelector('[data-clear-district]').click();
  expect(onClear).toHaveBeenCalledOnce();
  expect(document.querySelector('dialog')).toBeNull();
});

it('Escape로 취소하고 열기 버튼에 포커스를 돌린다', () => {
  const { trigger, onApply } = setup();
  document.querySelector('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(document.querySelector('dialog')).toBeNull();
  expect(onApply).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(trigger);
});
