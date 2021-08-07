const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');

class flood extends Command {
  constructor (client) {
    super(client, {
      name: 'flood',
      description: 'Play a game of flood.',
      usage: 'flood',
      category: 'Games',
      enabled: false
    });
  }

  async run (msg, text) {
    const WIDTH = 13;
    const HEIGHT = 13;
    const SQUARES = { red_sqaure: '🟥', blue_sqaure: '🟦', orange_sqaure: '🟧', purple_sqaure: '🟪', green_sqaure: '🟩' };
    const gameBoard = [];
    const turn = 1;

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
      /*
      const row = new DiscordJS.MessageActionRow()
        .addComponents(Object.entries(SQUARES).map(([k, v]) => new DiscordJS.MessageButton()
          .setCustomId(k)
          .setLabel(v)
          .setStyle('SECONDARY')));
          */

      const embed = new DiscordJS.MessageEmbed()
        .setColor('#08b9bf')
        .setTitle('Flood')
        .setDescription(gameBoardToString())
        .addField('Turn:', turn.toString())
        .setFooter(`Currently Playing: ${msg.author.username}`)
        .setTimestamp();

      return embed;
      /*
      return {
        embeds: [embed],
        componets: [row]
      };
      */
    }

    function update (selected) {
      this.turn += 1;
      const current = this.gameBoard[0];
      const queue = [{ x: 0, y: 0 }];
      const visited = [];
      while (queue.length > 0) {
        const pos = queue.shift();
        if (!pos || visited.includes(pos)) { continue; }
        visited.push(pos);
        if (this.gameBoard[pos.y * WIDTH + pos.x] === current) {
          this.gameBoard[pos.y * WIDTH + pos.x] = selected;
          const upPos = position_1.up(pos);
          if (!visited.includes(upPos) && upPos.y >= 0) { queue.push(upPos); }
          const downPos = position_1.down(pos);
          if (!visited.includes(downPos) && downPos.y < HEIGHT) { queue.push(downPos); }
          const leftPos = position_1.left(pos);
          if (!visited.includes(leftPos) && leftPos.x >= 0) { queue.push(leftPos); }
          const rightPos = position_1.right(pos);
          if (!visited.includes(rightPos) && rightPos.x < WIDTH) { queue.push(rightPos); }
        }
      }
      let gameOver = true;
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          if (this.gameBoard[y * WIDTH + x] !== selected) gameOver = false;
        }
      }
      if (gameOver) { this.gameOver({ result: game_result_1.ResultType.WINNER, score: (this.turn - 1).toString() }); } else { step(); }
    }

    msg.channel.send(getContent());
  }
}

module.exports = flood;
