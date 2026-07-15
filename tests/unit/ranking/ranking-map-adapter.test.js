import { expect, it, vi } from 'vitest';
import { createTileLoadCycleReporter } from '../../../src/features/ranking/ranking-map-adapter.js';

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
