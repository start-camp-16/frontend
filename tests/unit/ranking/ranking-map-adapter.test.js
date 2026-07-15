import { expect, it, vi } from 'vitest';
import { createPopupContent, createTileLoadCycleReporter } from '../../../src/features/ranking/ranking-map-adapter.js';

it('데스크톱 팝업에는 fallback 가능한 이미지를 표시하고 모바일에서는 생략한다', () => {
  const item = { rank:1, title:'서울숲', address:'서울 성동구', thumbnail_url:null, image_url:null };
  const desktop = createPopupContent(item, { isDesktop:true, fallbackUrl:'fallback.png' });
  expect(desktop.querySelector('strong').textContent).toContain('서울숲');
  expect(desktop.querySelector('p').textContent).toBe('서울 성동구');
  expect(desktop.querySelector('img').src).toContain('fallback.png');

  const remote = createPopupContent({ ...item, thumbnail_url:'place.png' }, { isDesktop:true, fallbackUrl:'fallback.png' });
  remote.querySelector('img').dispatchEvent(new Event('error'));
  expect(remote.querySelector('img').src).toContain('fallback.png');

  const mobile = createPopupContent(item, { isDesktop:false, fallbackUrl:'fallback.png' });
  expect(mobile.querySelector('img')).toBeNull();
});

it('타일 일부가 성공하면 지도 실패로 보고하지 않는다', () => {
  const onStatusChange = vi.fn();
  const reporter = createTileLoadCycleReporter(onStatusChange);

  reporter.start();
  reporter.failure();
  reporter.success();
  reporter.finish();

  expect(onStatusChange).toHaveBeenCalledWith({ failed:false });
});

it('로딩 주기의 모든 타일이 실패한 경우에만 실패로 보고한다', () => {
  const onStatusChange = vi.fn();
  const reporter = createTileLoadCycleReporter(onStatusChange);

  reporter.start();
  reporter.failure();
  reporter.failure();
  reporter.finish();

  expect(onStatusChange).toHaveBeenCalledWith({ failed:true });
});

it('다음 로딩 주기의 성공을 독립적으로 보고한다', () => {
  const onStatusChange = vi.fn();
  const reporter = createTileLoadCycleReporter(onStatusChange);

  reporter.start();
  reporter.failure();
  reporter.finish();
  reporter.start();
  reporter.success();
  reporter.finish();

  expect(onStatusChange.mock.calls).toEqual([[{ failed:true }], [{ failed:false }]]);
});
