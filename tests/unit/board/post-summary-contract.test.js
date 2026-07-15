import { expect, it } from 'vitest';
import fs from 'node:fs';

it('PostSummary가 필수 district와 prefix를 제공한다', () => {
  const yaml = fs.readFileSync('shared/openapi.yaml', 'utf8');
  const postSummary = yaml.slice(yaml.indexOf('    PostSummary:'), yaml.indexOf('    PostDetail:'));

  expect(postSummary).toContain('required: [id, district, prefix, title, created_at, updated_at]');
  expect(postSummary).toContain("$ref: '#/components/schemas/PostDistrict'");
  expect(postSummary).toContain("$ref: '#/components/schemas/PostPrefix'");
  expect(postSummary).not.toContain('comment_count');
});
