import { describe, expect, it } from 'vitest';

import { boardOf, listItem } from '../task-test-fixtures';

import { columnDropId, planDrop, planMoveTo, planStep } from './board-order';

const a = listItem({ id: 'b1', number: 201, status: 'todo', boardOrder: 1000 });
const b = listItem({ id: 'b2', number: 202, status: 'todo', boardOrder: 2000 });
const c = listItem({ id: 'b3', number: 203, status: 'todo', boardOrder: 3000 });
const r = listItem({ id: 'b4', number: 204, status: 'review', boardOrder: 500 });
const board = boardOf([a, b, c, r]);

describe('planDrop', () => {
  it('puts a card moved down below the card it was dropped on', () => {
    expect(planDrop(board, a.id, b.id)).toEqual({ status: 'todo', boardOrder: 2500 });
  });

  it('puts a card moved up above the card it was dropped on', () => {
    expect(planDrop(board, c.id, a.id)).toEqual({ status: 'todo', boardOrder: -24 });
  });

  it('puts a card from another column above the card it lands on', () => {
    expect(planDrop(board, r.id, b.id)).toEqual({ status: 'todo', boardOrder: 1500 });
  });

  it('puts a card dropped on a column at its foot', () => {
    expect(planDrop(board, a.id, columnDropId('review'))).toEqual({
      status: 'review',
      boardOrder: 1524,
    });
    expect(planDrop(board, a.id, columnDropId('blocked'))).toEqual({
      status: 'blocked',
      boardOrder: 1024,
    });
  });

  it('sends nothing for a card dropped where it already is', () => {
    expect(planDrop(board, b.id, b.id)).toBeNull();
    expect(planDrop(board, c.id, columnDropId('todo'))).toBeNull();
  });
});

describe('planStep', () => {
  it('moves one place up or down, and not past either end', () => {
    expect(planStep(board, b.id, -1)).toEqual({ status: 'todo', boardOrder: -24 });
    expect(planStep(board, b.id, 1)).toEqual({ status: 'todo', boardOrder: 4024 });
    expect(planStep(board, a.id, -1)).toBeNull();
    expect(planStep(board, c.id, 1)).toBeNull();
  });
});

describe('planMoveTo', () => {
  it('puts the card at the top of another column', () => {
    expect(planMoveTo(board, a.id, 'review')).toEqual({ status: 'review', boardOrder: -524 });
    expect(planMoveTo(board, a.id, 'done')).toEqual({ status: 'done', boardOrder: 1024 });
    expect(planMoveTo(board, a.id, 'todo')).toBeNull();
  });
});
