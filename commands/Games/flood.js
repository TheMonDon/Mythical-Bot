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
    let game;
    const up = (pos) => ({ x: pos.x, y: pos.y - 1 });
    const down = (pos) => ({ x: pos.x, y: pos.y + 1 });
    const left = (pos) => ({ x: pos.x - 1, y: pos.y });
    const right = (pos) => ({ x: pos.x + 1, y: pos.y });

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
      turn += 1;
      const current = gameBoard[0];
      const queue = [{ x: 0, y: 0 }];
      const visited = [];
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
      let gameOver = true;
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          if (this.gameBoard[y * WIDTH + x] !== selected) gameOver = false;
        }
      }
      if (gameOver) {
        this.gameOver({ result: game_result_1.ResultType.WINNER, score: (this.turn - 1).toString() });
      } else {
        step();
      }
    }

    function onInteraction (interaction) {
      let _a;
      if (!interaction.isButton()) { return; }
      const selected = Object.entries(SQUARES).find(([k, v]) => k === interaction.customId);
      if (selected) { update(selected[1]); }
      if (this.isInGame()) { interaction.update(this.getContent()); } else { int; }
    }

    game = await msg.channel.send(getContent());
  }
}

module.exports = Flood;
