const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');
const { stripIndents } = require('common-tags');
const Discord = require('discord.js');
import GameBase from './game-base';
import { GameContent } from './game-content';

const WIDTH = 15;
const HEIGHT = 10;

class SnakeGame extends Command {
  constructor(client) {
    super(client, {
      name: 'snake',
      description: 'Play a game of snake.',
      usage: 'snake',
      category: 'Games',
      permLevel: 'Owner'
    });
  }

  async run(msg) {
    let gameBoard = [];
    let apple = { x: 1, y: 1 };
    let snake = [];
    let snakeLength = 1;
    let score = 0;

    snake.push({ x: 5, y: 5 });
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        gameBoard[y * WIDTH + x] = '🟦';
      }
    }

    function initGame() {
      return new SnakeGame();
    }

    function getGameboard() {
      let str = '';
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          if (x == apple.x && y == apple.y) {
            str += '🍎';
            continue;
          }

          let flag = true;
          for (let s = 0; s < snake.length; s++) {
            if (x === snake[s].x && y === snake[s].y) {
              if (s === 0) {
                if (inGame)
                  str += '🐍';
                else
                  str += '☠️';
              } else {
                str += '🟩';
              }
              flag = false;
            }
          }

          if (flag)
            str += gameBoard[y * WIDTH + x];
        }
        str += '\n';
      }
      return str;
    }

    function isLocInSnake(pos) {
      return snake.find(sPos => sPos.x == pos.x && sPos.y == pos.y) !== undefined;
    }

    function newAppleLoc() {
      let newApplePos = { x: 0, y: 0 };
      do {
        newApplePos = { x: Math.floor(Math.random() * WIDTH), y: Math.floor(Math.random() * HEIGHT) };
      } while (isLocInSnake(newApplePos));

      apple.x = newApplePos.x;
      apple.y = newApplePos.y;
    }

    function newGame(msg, player2, onGameEnd) {
      if (isInGame()) return;
      score = 0;
      snakeLength = 1;
      snake = [{ x: 5, y: 5 }];
      newAppleLoc();
      newGame(msg, player2, onGameEnd, ['⬅️', '⬆️', '⬇️', '➡️']);
    }

    function getContent() {
      return {
        embeds: [new Discord.MessageEmbed()
          .setColor('#03ad03')
          .setTitle('Snake Game')
          .setAuthor('Made By: TurkeyDev', 'https://site.theturkey.dev/images/turkey_avatar.png', 'https://www.youtube.com/watch?v=tk5c0t72Up4')
          .setDescription(getGameboard())
          .setFooter(`Currently Playing: ${msg.author.username}`)
          .setTimestamp()
        ]
      };
    }

    function getGameOverContent(result) {
      return {
        embeds: [new Discord.MessageEmbed()
          .setColor('#03ad03')
          .setTitle('Snake Game')
          .setAuthor('Made By: TurkeyDev', 'https://site.theturkey.dev/images/turkey_avatar.png', 'https://www.youtube.com/watch?v=tk5c0t72Up4')
          .setDescription(`**GAME OVER!**\nScore: ${score}\n\n${getGameboard()}`)
          .setTimestamp()
        ]
      };
    }

    function step() {
      if (apple.x == snake[0].x && apple.y == snake[0].y) {
        score += 1;
        snakeLength++;
        newAppleLoc();
      }
      super.step();
    }

    function onReaction(reaction) {
      const snakeHead = snake[0];
      const nextPos = { x: snakeHead.x, y: snakeHead.y };
      if (reaction.emoji.name === '⬅️') {
        const nextX = snakeHead.x - 1;
        if (nextX < 0) {
          gameOver({ result: loser, score: score.toString() });
          return;
        }
        nextPos.x = nextX;
      } else if (reaction.emoji.name === '⬆️') {
        const nextY = snakeHead.y - 1;
        if (nextY < 0) {
          gameOver({ result: loser, score: score.toString() });
          return;
        }
        nextPos.y = nextY;
      } else if (reaction.emoji.name === '⬇️') {
        const nextY = snakeHead.y + 1;
        if (nextY >= HEIGHT) {
          gameOver({ result: loser, score: score.toString() });
          return;
        }
        nextPos.y = nextY;
      } else if (reaction.emoji.name === '➡️') {
        const nextX = snakeHead.x + 1;
        if (nextX >= WIDTH) {
          gameOver({ result: loser, score: score.toString() });
          return;
        }
        nextPos.x = nextX;
      }

      if (isLocInSnake(nextPos)) {
        gameOver({ result: loser, score: score.toString() });
      } else {
        snake.unshift(nextPos);
        if (snake.length > snakeLength)
          snake.pop();
        step();
      }
    }

    function onInteraction(interaction) {}
  }
}

module.exports = SnakeGame;