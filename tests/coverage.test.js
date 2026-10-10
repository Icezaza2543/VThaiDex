import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fmt, pct } from '../src/lib/api.js';
import {
  INCOMPLETE_YEAR_NOTE, YOUTUBE_MEASURE_NOTE, countKnown, isIncompleteYear, knownPercent, subsetLine, subsetNote,
} from '../src/lib/coverage.js';

test('subset line drops unknown from the count and says so', () => {
  const rows = [
    { status: 'active', count: 30 },
    { status: 'unknown', count: 40 },
    { status: 'ไม่ระบุสถานะ', count: 10 },
    { status: 'graduated', count: 20 },
  ];
  const { counted, unknown } = countKnown(rows);
  assert.equal(counted, 50);
  assert.equal(unknown, 50);
  assert.equal(subsetLine(counted, 100, unknown), `นับจาก ${fmt(50)} คน (${pct(50, 100)}% ของทั้งหมด) ไม่นับค่าที่ไม่ทราบ`);
  assert.equal(knownPercent(30, 100, unknown), 60);
  assert.notEqual(knownPercent(30, 100, unknown), pct(30, 100));
  assert.equal(subsetLine(100, 100, 0), `นับจาก ${fmt(100)} คน (${pct(100, 100)}% ของทั้งหมด)`);
  assert.equal(subsetNote(100, 100, 0), '');
  assert.match(subsetNote(50, 100, 50), /ไม่นับค่าที่ไม่ทราบ/);
});

test('incomplete year is only the current calendar year', () => {
  assert.equal(isIncompleteYear(2026, '2026-10-11'), true);
  assert.equal(isIncompleteYear(2025, '2026-10-11'), false);
  assert.equal(isIncompleteYear('2026', '2026-01-01'), true);
  assert.equal(isIncompleteYear(2026, '2027-01-01'), false);
  assert.equal(isIncompleteYear(2026, new Date(2026, 9, 11)), true);
  assert.equal(isIncompleteYear(2025, new Date(2026, 9, 11)), false);
});

test('data page states how to read the figures and does not use the causal size headline', () => {
  const analytics = readFileSync(new URL('../src/pages/Analytics.jsx', import.meta.url), 'utf8');
  const insights = readFileSync(new URL('../src/pages/insights.jsx', import.meta.url), 'utf8');
  assert.match(analytics, /อ่านข้อมูลนี้อย่างไร/);
  for (const line of [
    'นับเฉพาะ VTuber ที่สารบบรู้จัก คนที่อยู่แพลตฟอร์มเดียว (เช่น TikTok หรือ Facebook) อาจถูกนับน้อยกว่าจริง',
    'ช่องที่ถูกลบไปก่อนเราเริ่มเก็บข้อมูลไม่อยู่ในสถิติ ปีเก่าจึงอาจดูน้อยกว่าจริง',
    'ปีล่าสุดยังไม่ครบ ตัวเลขจะเพิ่มขึ้นเมื่อพบคนใหม่',
    'ขนาดและความเคลื่อนไหววัดจาก YouTube เป็นหลัก',
    'ตัวเลขบอกสิ่งที่เกิดขึ้น ไม่ได้บอกสาเหตุ',
  ]) {
    assert.equal(analytics.includes(line), true, line);
  }
  assert.equal(insights.includes('ยิ่งช่องใหญ่'), false);
  assert.equal(insights.includes('ช่องที่ใหญ่มักอยู่ในค่ายใหญ่'), true);
  assert.equal(insights.includes('YOUTUBE_MEASURE_NOTE'), true);
  assert.equal(insights.includes('INCOMPLETE_YEAR_NOTE'), true);
  assert.equal(analytics.includes('INCOMPLETE_YEAR_NOTE'), true);
  assert.equal(analytics.includes('subsetNote'), true);
  assert.equal(YOUTUBE_MEASURE_NOTE, 'วัดจาก YouTube เป็นหลัก สายไลฟ์ Twitch/TikTok อาจดูเล็กหรือเงียบกว่าความจริง');
  assert.equal(INCOMPLETE_YEAR_NOTE, 'ปีนี้ยังไม่จบ และคนที่เพิ่งเดบิวต์อาจยังไม่อยู่ในสารบบ');
});
