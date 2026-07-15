import { POST_DISTRICTS } from './board-constants.js';

export function openDistrictModal({ selectedDistrict = '', trigger, onApply, onClear }) {
  let draftDistrict = selectedDistrict;
  const dialog = document.createElement('dialog');
  dialog.className = 'district-dialog';
  dialog.innerHTML = `
    <div class="district-dialog__surface">
      <header class="district-dialog__head">
        <div><p class="eyebrow">Seoul district</p><h2>지역 필터</h2><p>보고 싶은 지역을 선택해 주세요.</p></div>
        <button class="district-dialog__close" type="button" aria-label="지역 필터 닫기">×</button>
      </header>
      <div class="district-dialog__scroll">
        <p class="district-dialog__group-label">서울</p>
        <div class="district-option-grid" role="group" aria-label="서울 지역 선택"></div>
      </div>
      <footer class="district-dialog-actions">
        <button type="button" class="button button--secondary" data-clear-district>전체 보기</button>
        <button type="button" class="button" data-apply-district>적용</button>
      </footer>
    </div>`;

  const grid = dialog.querySelector('.district-option-grid');
  const buttons = POST_DISTRICTS.map((district) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.districtOption = district;
    button.textContent = district;
    button.setAttribute('aria-pressed', String(district === draftDistrict));
    button.addEventListener('click', () => {
      draftDistrict = district;
      buttons.forEach((option) => option.setAttribute('aria-pressed', String(option.dataset.districtOption === draftDistrict)));
    });
    grid.append(button);
    return button;
  });

  const close = () => {
    dialog.remove();
    trigger?.focus();
  };
  dialog.querySelector('.district-dialog__close').addEventListener('click', close);
  dialog.querySelector('[data-clear-district]').addEventListener('click', () => { onClear?.(); close(); });
  dialog.querySelector('[data-apply-district]').addEventListener('click', () => { onApply?.(draftDistrict); close(); });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  dialog.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  document.body.append(dialog);
  if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
  (buttons.find((button) => button.dataset.districtOption === draftDistrict) ?? buttons[0])?.focus();
  return { dialog, close };
}
