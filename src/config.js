export const CONFIG = {
  CANVAS_W: 500,
  CANVAS_H: 800,
  HUD_H: 40,
  BLOCK_COLS: 150,
  BLOCK_ROWS: 100,
  BLOCK_W: 3,
  BLOCK_H: 3,
  BLOCK_OFFSET_X: 25,   // (500 - 150*3) / 2
  BLOCK_OFFSET_Y: 40,   // HUD_H
  PADDLE_W: 80,
  PADDLE_H: 10,
  PADDLE_Y: 750,
  PADDLE_SPEED: 400,    // px/sec

  BALL_SIZE: 3,
  BALL_SPEED_INITIAL: 350, // px/sec

  INITIAL_LIVES: 3,
  EXTEND_SCORE: 1000,
  ITEM_DURATION: 30, // seconds
};

export const GAME_STATE = {
  READY: 0,
  PLAYING: 1,
  GAMEOVER: 2,
  PAUSE: 3,
  CLEAR: 4,
  TITLE: 5
};

export const BLOCK_TYPES = {
  1: { color: '#00f', score: 10 },
  2: { color: '#0f0', score: 20 },
  3: { color: '#ff0', score: 30 },
  4: { color: '#f80', score: 40 },
  5: { color: '#f00', score: 50 },
};
