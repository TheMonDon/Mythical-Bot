const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const { Duration } = require('luxon');
const db = new QuickDB();

// I left this alone on December 9th, unable to figure out how to get buttons to work :(

class FloodButtons extends Command {
  constructor(client) {
    super(client, {
      name: 'flood-buttons',
      description: 'Play a game of flood.',
      usage: 'flood-buttons',
      category: 'Administrator',
      permLevel: 'Administrator',
    });
  }

  async run(msg) {
    const WIDTH = 13;
    const HEIGHT = 13;
    const SQUARES = {
      red_square: '🟥',
      blue_square: '🟦',
      orange_square: '🟧',
      purple_square: '🟪',
      green_square: '🟩',
    };
    const gameBoard = [];
    let turn = 0;
    let message;
    let gameOver = false;
    let result;
    const gameStart = msg.createdAt;
    let gameEnd;

    const current = this.client.games.get(msg.channel.id);
    if (current) return msg.reply(`Please wait until the current game of \`${current.name}\` is finished.`);
    // this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id });

    const up = (pos) => ({ x: pos.x, y: pos.y - 1 });
    const down = (pos) => ({ x: pos.x, y: pos.y + 1 });
    const left = (pos) => ({ x: pos.x - 1, y: pos.y });
    const right = (pos) => ({ x: pos.x + 1, y: pos.y });

    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        gameBoard[y * WIDTH + x] = Object.values(SQUARES)[Math.floor(Math.random() * Object.keys(SQUARES).length)];
      }
    }

    function gameBoardToString() {
      let str = '';
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          str += gameBoard[y * WIDTH + x];
        }
        str += '\n';
      }
      return str;
    }

    async function getContent() {
      let embed;
      if (gameOver === true) {
        const gameTimeMillis = gameEnd - gameStart;
        let gameTime;
        if (!isNaN(gameTimeMillis))
          gameTime = Duration.fromMillis(gameTimeMillis).shiftTo('minutes', 'seconds').toHuman();
        const gameTimeSeconds = gameTimeMillis / 1000;
        const turnResp = {
          winner: `Game beat in ${turn} turns! \nGame Time: ${gameTime}`,
          timeOut: 'Game timed out due to inactivity.',
          error: 'Game ended with an error.',
          maxTurns: 'Game ended because you reached the max turns.',
          playing: "Game shouldn't have ended. :(",
          earlyEnd: 'Game player decided to quit.',
        };

        let highScore;
        let highScoreUser;
        let highScoreTime;
        if (result === 'winner') {
          const HS = { score: turn, user: msg.author.tag, time: gameTimeSeconds };
          const oldHS = await db.get('global.highScores.flood');
          highScore = oldHS?.score || 0;
          highScoreUser = oldHS?.user || 'N/A';
          highScoreTime = oldHS?.time || 0;
          if (HS.score < highScore || !oldHS) {
            await db.set('global.highScores.flood', HS);
            highScore = HS.score;
            highScoreUser = 'You';
            highScoreTime = gameTimeSeconds;
          } else if (HS.score === highScore && HS.time <= highScoreTime) {
            await db.set('global.highScores.flood', HS);
            highScore = HS.score;
            highScoreUser = 'You';
            highScoreTime = gameTimeSeconds;
          }
        } else {
          const oldHS = await db.get('global.highScores.flood');
          highScore = oldHS?.score || 0;
          highScoreUser = oldHS?.user || 'N/A';
          highScoreTime = oldHS?.time || 0;
        }

        if (!isNaN(highScoreTime))
          highScoreTime = Duration.fromMillis(highScoreTime * 1000)
            .shiftTo('minutes', 'seconds')
            .toHuman();
        embed = new EmbedBuilder()
          .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
          .setColor('#08b9bf')
          .setTitle('Flood')
          .setDescription(`${gameBoardToString()} \nGame Over! \n${turnResp[result]}`)
          .addFields([{ name: 'High Score', value: `${highScore} turns by ${highScoreUser} in ${highScoreTime}` }])
          .setTimestamp();
      } else {
        embed = new EmbedBuilder()
          .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
          .setColor('#08b9bf')
          .setTitle('Flood')
          .setDescription(
            `${gameBoardToString()} 
Fill the entire image with the same color in 25 or fewer flood tiles (turns).

Click on the buttons below to fill the area above.
Filling starts at the top left corner.`,
          )
          .addFields([{ name: 'Turn:', value: turn.toString() }])
          .setFooter({ text: `Currently Playing: ${msg.author.username}` })
          .setTimestamp();
      }

      return [embed];
    }

    try {
      // New button collector
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(':red_square:').setLabel('Red').setEmoji('🟥').setStyle('Secondary'),
        new ButtonBuilder().setCustomId(':blue_square:').setLabel('Blue').setEmoji('🟦').setStyle('Secondary'),
        new ButtonBuilder().setCustomId(':orange_square:').setLabel('Orange').setEmoji('🟧').setStyle('Secondary'),
        new ButtonBuilder().setCustomId(':purple_square:').setLabel('Purple').setEmoji('🟪').setStyle('Secondary'),
        new ButtonBuilder().setCustomId(':green_ square:').setLabel('Green').setEmoji('🟩').setStyle('Secondary'),
      );

      message = await msg.channel.send({ embeds: getContent(), components: [row] });

      if (message) {
        message.edit({ embeds: getContent(), components: [row] });
      }

      const current = gameBoard[0];
      const queue = [{ x: 0, y: 0 }];
      const visited = [];
      let selected = null;

      const filter = (interaction) => {
        if (interaction.user.id === msg.author.id) return true;
        interaction.reply({ content: "You can't use this button.", ephemeral: true });
      };

      const collector = await message.createMessageComponentCollector({ filter, max: 25 });

      collector.on('end', async (collected) => {
        if (collected.size === 0) {
          gameOver = true;
          result = 'timeOut';
          this.client.games.delete(msg.channel.id);
          return message.edit({ embeds: getContent(), components: [row] });
        }
        if (collected.deferred === false) {
          await collected.deferUpdate();
        }
        selected = collected.customId;

        /*
        if (selected === '🛑') {
          gameOver = true;
          result = 'earlyEnd';
          this.client.games.delete(msg.channel.id);
          return message.edit({ embeds: getContent(), components: [row] });
        }
        */

        // while (gameOver === false && turn < 25) {
        console.log(turn);
        console.log(queue.length);
        turn += 1;
        while (queue.length > 0) {
          const pos = queue.shift();
          if (!pos || visited.includes(pos)) {
            continue;
          }
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

        gameOver = true;
        result = 'winner';
        gameEnd = Date.now();
        for (let y = 0; y < HEIGHT; y++) {
          for (let x = 0; x < WIDTH; x++) {
            if (gameBoard[y * WIDTH + x] !== selected) {
              gameOver = false;
              result = 'playing';
            }
          }
        }
        // }
      });

      if (gameOver === true) {
        this.client.games.delete(msg.channel.id);
        return message.edit({ embeds: getContent() });
      }

      if (turn >= 25) {
        this.client.games.delete(msg.channel.id);
        gameOver = true;
        result = 'maxTurns';
        return message.edit({ embeds: getContent() });
      }
    } catch (err) {
      this.client.games.delete(msg.channel.id);

      console.error(err);
      gameOver = true;
      result = 'error';
      return message.edit({ embeds: getContent() });
    }
  }
}

module.exports = FloodButtons;
