const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');

class Flood extends Command {
  constructor (client) {
    super(client, {
      name: 'flood',
      description: 'Play a game of flood.',
      usage: 'flood',
      category: 'Games'
    });
  }

  async run (msg, text) {
    const WIDTH = 13;
    const HEIGHT = 13;
    const SQUARES = { red_sqaure: '🟥', blue_sqaure: '🟦', orange_sqaure: '🟧', purple_sqaure: '🟪', green_sqaure: '🟩' };
    const gameBoard = [];
    let turn = 1;
    let message;
    let isOver = false;

    const up = (pos) => ({ x: pos.x, y: pos.y - 1 });
    const down = (pos) => ({ x: pos.x, y: pos.y + 1 });
    const left = (pos) => ({ x: pos.x - 1, y: pos.y });
    const right = (pos) => ({ x: pos.x + 1, y: pos.y });

    try {
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          gameBoard[y * WIDTH + x] = Object.values(SQUARES)[Math.floor(Math.random() * Object.keys(SQUARES).length)];
        }
      }

      function gameBoardToString () {
        let str = '';
        for (let y = 0; y < HEIGHT; y++) {
          for (let x = 0; x < WIDTH; x++) {
            str += gameBoard[y * WIDTH + x];
          }
          str += '\n';
        }
        return str;
      }

      function getContent () {
        const embed = new DiscordJS.MessageEmbed()
          .setColor('#08b9bf')
          .setTitle('Flood')
          .setDescription(gameBoardToString())
          .addField('Turn:', turn.toString())
          .setFooter(`Currently Playing: ${msg.author.username}`)
          .setTimestamp();

        return embed;
      }

      function gameOver (result) {
        let _a, _b, _c;
        if (!this.inGame) { return; }
        this.result = result;
        this.inGame = false;
        if (result.result !== 'FORCE_END') {
          this.onGameEnd(result);
          if (this.usesReactions) {
            (_a = this.gameMessage) === null || _a === undefined ? undefined : _a.edit(this.getGameOverContent(result));
            (_b = this.gameMessage) === null || _b === undefined ? undefined : _b.reactions.removeAll();
          }
        } else {
          (_c = this.gameMessage) === null || _c === void 0 ? void 0 : _c.edit(this.getGameOverContent(result));
          if (this.gameTimeoutId) { clearTimeout(this.gameTimeoutId); }
        }
      }

      while (!isOver) {
        turn += 1;
        const current = gameBoard[0];
        const queue = [{ x: 0, y: 0 }];
        const visited = [];
        let selected;

        const filter = (reaction, user) => {
          return reaction.emoji.namer === (SQUARES.red_square || SQUARES.blue_sqaure || SQUARES.orange_sqaure || SQUARES.purple_sqaure || SQUARES.green_sqaure) && user.id === msg.author.id;
        };

        if (!message) {
          message = await msg.channel.send(getContent());
          await message.react(SQUARES.red_square);
          await message.react(SQUARES.blue_square);
          await message.react(SQUARES.orange_sqaure);
          await message.react(SQUARES.purple_sqaure);
          await message.react(SQUARES.green_sqaure);
        } else {
          message.edit(getContent());
        }
        message.awaitReactions(filter, { max: 1, time: 60000, erors: ['time'] })
          .then(collected => { selected = collected.first().reaction.emoji.name; });

        while (queue.length > 0) {
          const pos = queue.shift();
          if (!pos || visited.includes(pos)) { continue; }
          visited.push(pos);
          if (gameBoard[pos.y * WIDTH + pos.x] === current) {
            gameBoard[pos.y * WIDTH + pos.x] = selected;
            const upPos = up(pos);
            if (!visited.includes(upPos) && upPos.y >= 0) { queue.push(upPos); }
            const downPos = down(pos);
            if (!visited.includes(downPos) && downPos.y < HEIGHT) { queue.push(downPos); }
            const leftPos = left(pos);
            if (!visited.includes(leftPos) && leftPos.x >= 0) { queue.push(leftPos); }
            const rightPos = right(pos);
            if (!visited.includes(rightPos) && rightPos.x < WIDTH) { queue.push(rightPos); }
          }
        }
        for (let y = 0; y < HEIGHT; y++) {
          for (let x = 0; x < WIDTH; x++) {
            if (gameBoard[y * WIDTH + x] === selected) isOver = true;
          }
        }
      }
      if (isOver) {
        const embed = new DiscordJS.MessageEmbed()
          .setColor('#08b9bf')
          .setTitle('Flood')
          .setDescription(`Game Over! \nGame beat in ${turn - 1} rounds.`)
          .setTimestamp();
        msg.channel.send(embed);
      }
    } catch (err) {
      this.client.games.delete(msg.channel.id);
      throw err;
    }
  }
}

module.exports = Flood;
