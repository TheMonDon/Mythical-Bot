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
    let turn = 0;
    let message;
    let gameOver = false;
    let result;

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

      let amount = 1;
      while (gameOver === false && amount < 100) {
        turn += 1;
        amount += 1;
        const current = gameBoard[0];
        const queue = [{ x: 0, y: 0 }];
        const visited = [];
        let selected = null;

        const filter = (reaction, user) => {
          return (reaction.emoji.name === '🟥' || reaction.emoji.name === '🟦' || reaction.emoji.name === '🟧' || reaction.emoji.name === '🟪' || reaction.emoji.name === '🟩') && user.id === msg.author.id;
        };

        if (!message) {
          message = await msg.channel.send(getContent());
          await message.react('🟥');
          await message.react('🟦');
          await message.react('🟧');
          await message.react('🟪');
          await message.react('🟩');
        } else {
          message.edit(getContent());
        }

        message.awaitReactions(filter, { max: 1, time: 60000, erors: ['time'] })
          .then(collected => {
            selected = collected.first().reaction.emoji.name;
            const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(msg.author.id));
            try {
              for (const reaction of userReactions.values()) {
                reaction.users.remove(msg.author.id);
              }
            } catch (err) { console.log(err); }
          })
          .catch((err) => {
            console.log(err);
            result = 'Error';
          });

        while (queue.length > 0) {
          const pos = queue.shift();
          if (!pos || visited.includes(pos)) { continue; }
          visited.push(pos);
          if (gameBoard[pos.y * WIDTH + pos.x] === current) {
            gameBoard[pos.y * WIDTH + pos.x] = selected;
            const upPos = up(pos);
            if (!visited.includes(upPos) && upPos.y >= 0) {
              queue.push(upPos);
            }
            const downPos = down(pos);
            if (!visited.includes(downPos) && downPos.y < HEIGHT) {
              queue.push(downPos);
            }
            const leftPos = left(pos);
            if (!visited.includes(leftPos) && leftPos.x >= 0) {
              queue.push(leftPos);
            }
            const rightPos = right(pos);
            if (!visited.includes(rightPos) && rightPos.x < WIDTH) {
              queue.push(rightPos);
            }
          }
        }

        for (let y = 0; y < HEIGHT; y++) {
          for (let x = 0; x < WIDTH; x++) {
            if (gameBoard[y * WIDTH + x] === selected) {
              console.log(gameBoard[y * WIDTH + x]);
              console.log(selected);
              gameOver = true;
              result = 'winner';
            }
          }
        }
      }

      if (gameOver === true) {
        this.client.games.delete(msg.channel.id);
        const turnResp = result === 'winner' ? `Game beat in ${turn} turns!` : '';

        const embed = new DiscordJS.MessageEmbed()
          .setColor('#08b9bf')
          .setTitle('Flood')
          .setDescription(`Game Over! \n${turnResp}`)
          .setTimestamp();
        return msg.channel.send(embed);
      } else {
        msg.channel.send('Error: Something went wrong, isOver is false.');
      }
    } catch (err) {
      console.log(err);
      this.client.games.delete(msg.channel.id);
      const turnResp = result === 'winner' ? `Game beat in ${turn} turns!` : '';

      const embed = new DiscordJS.MessageEmbed()
        .setColor('#08b9bf')
        .setTitle('Flood')
        .setDescription(`Game Over! \n${turnResp}`)
        .setTimestamp();
      return msg.channel.send(embed);
    }
  }
}

module.exports = Flood;
