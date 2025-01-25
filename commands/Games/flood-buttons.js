const Command = require('../../base/Command.js');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const { Duration } = require('luxon');
const db = new QuickDB();

class FloodButtons extends Command {
  constructor(client) {
    super(client, {
      name: 'flood-buttons',
      description: 'Play a game of flood',
      usage: 'flood-buttons',
      category: 'Games',
      aliases: ['floodbuttons', 'floodbutton'],
    });
  }

  async run(msg) {
    const WIDTH = 13;
    const HEIGHT = 13;
    const moves = 25;

    const SQUARES = {
      red_square: '🟥',
      blue_square: '🟦',
      orange_square: '🟧',
      purple_square: '🟪',
      green_square: '🟩',
    };
    const nameToEmoji = {
      ':red_square:': '🟥',
      ':blue_square:': '🟦',
      ':orange_square:': '🟧',
      ':purple_square:': '🟪',
      ':green_square:': '🟩',
      ':octagonal_sign:': '🛑',
    };

    const color = msg.settings.embedColor;
    const gameStart = msg.createdAt;
    const gameBoard = [];
    let gameOver = false;
    let turn = 0;
    let lastMove;
    let message;
    let gameEnd;
    let result;

    const current = this.client.games.get(msg.channel.id);
    if (current) {
      return this.client.util.errorEmbed(msg, `Please wait until the current game of \`${current.name}\` is finished.`);
    }
    this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id });

    const up = (pos) => ({ x: pos.x, y: pos.y - 1 });
    const down = (pos) => ({ x: pos.x, y: pos.y + 1 });
    const left = (pos) => ({ x: pos.x - 1, y: pos.y });
    const right = (pos) => ({ x: pos.x + 1, y: pos.y });

    // Randomly generate the game board
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        gameBoard[y * WIDTH + x] = Object.values(SQUARES)[Math.floor(Math.random() * Object.keys(SQUARES).length)];
      }
    }

    // Return the game board as a string
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

    // Get the content of the embed
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

        if (!isNaN(highScoreTime)) {
          highScoreTime = Duration.fromMillis(highScoreTime * 1000)
            .shiftTo('minutes', 'seconds')
            .toHuman();
        }

        embed = new EmbedBuilder()
          .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
          .setColor(color)
          .setTitle('Flood')
          .setDescription(`${gameBoardToString()} \nGame Over! \n${turnResp[result]}`)
          .addFields([{ name: 'High Score', value: `${highScore} turns by ${highScoreUser} in ${highScoreTime}` }])
          .setTimestamp();
      } else {
        embed = new EmbedBuilder()
          .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
          .setColor(color)
          .setTitle('Flood')
          .setDescription(
            `${gameBoardToString()} 
Fill the entire image with the same color in ${moves} or fewer flood tiles (turns).

Click on the reactions below to fill the area above.
Filling starts at the top left corner.`,
          )
          .addFields([{ name: 'Turn:', value: turn.toString() }])
          .setFooter({ text: `Currently Playing: ${msg.author.username}` })
          .setTimestamp();
      }

      return embed;
    }

    function getButtons(gameOver) {
      const redSquare = new ButtonBuilder().setCustomId(':red_square:').setEmoji('🟥').setStyle(ButtonStyle.Secondary);
      const blueSquare = new ButtonBuilder()
        .setCustomId(':blue_square:')
        .setEmoji('🟦')
        .setStyle(ButtonStyle.Secondary);
      const orangeSquare = new ButtonBuilder()
        .setCustomId(':orange_square:')
        .setEmoji('🟧')
        .setStyle(ButtonStyle.Secondary);
      const purpleSquare = new ButtonBuilder()
        .setCustomId(':purple_square:')
        .setEmoji('🟪')
        .setStyle(ButtonStyle.Secondary);
      const greenSquare = new ButtonBuilder()
        .setCustomId(':green_square:')
        .setEmoji('🟩')
        .setStyle(ButtonStyle.Secondary);
      const octagonalSign = new ButtonBuilder()
        .setCustomId(':octagonal_sign:')
        .setEmoji('🛑')
        .setStyle(ButtonStyle.Secondary);

      if (gameOver) {
        redSquare.setDisabled(true);
        blueSquare.setDisabled(true);
        orangeSquare.setDisabled(true);
        purpleSquare.setDisabled(true);
        greenSquare.setDisabled(true);
        octagonalSign.setDisabled(true);
      }

      const row1 = new ActionRowBuilder().addComponents(redSquare, blueSquare, orangeSquare, purpleSquare, greenSquare);
      const row2 = new ActionRowBuilder().addComponents(octagonalSign);

      return [row1, row2];
    }

    function checkWinCondition(selected) {
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          if (gameBoard[y * WIDTH + x] !== selected) {
            return false;
          }
        }
      }
      return true;
    }

    function floodFill(selected) {
      const current = gameBoard[0];
      const queue = [{ x: 0, y: 0 }];
      const visited = [];

      while (queue.length > 0) {
        const pos = queue.shift();
        if (!pos || visited.some((v) => v.x === pos.x && v.y === pos.y)) {
          continue;
        }
        visited.push(pos);
        if (gameBoard[pos.y * WIDTH + pos.x] === current) {
          gameBoard[pos.y * WIDTH + pos.x] = selected;
          const positions = [
            { pos: up(pos), valid: (pos) => pos.y >= 0 },
            { pos: down(pos), valid: (pos) => pos.y < HEIGHT },
            { pos: left(pos), valid: (pos) => pos.x >= 0 },
            { pos: right(pos), valid: (pos) => pos.x < WIDTH },
          ];

          for (const { pos: newPos, valid } of positions) {
            if (valid(newPos) && !visited.some((v) => v.x === newPos.x && v.y === newPos.y)) {
              queue.push(newPos);
            }
          }
        }
      }
    }

    try {
      const embed = await getContent();
      message = await msg.channel.send({ embeds: [embed], components: getButtons(gameOver) });

      const collector = message.createMessageComponentCollector({
        filter: (i) => i.user.id === msg.author.id,
        time: 300_000,
        idle: 60_000,
      });

      collector.on('collect', async (interaction) => {
        try {
          await interaction.deferUpdate();

          const selected = nameToEmoji[interaction.customId];

          if (selected === '🛑') {
            gameOver = true;
            result = 'earlyEnd';
            collector.stop();
            return;
          }

          if (selected === lastMove) {
            await interaction.followUp({
              content: "You can't flood with the same color twice in a row!",
              ephemeral: true,
            });
            return;
          }

          lastMove = selected;
          turn++;

          floodFill(selected);

          if (checkWinCondition(selected)) {
            gameOver = true;
            result = 'winner';
            gameEnd = Date.now();
            collector.stop();
            return;
          }

          if (turn >= moves) {
            gameOver = true;
            result = 'maxTurns';
            collector.stop();
            return;
          }

          const newEmbed = await getContent();
          await message.edit({ embeds: [newEmbed] });
        } catch (err) {
          collector.stop('error');
          this.client.logger.error(`Flood interaction error: ${err}`);
        }
      });

      collector.on('end', async (collected, reason) => {
        try {
          this.client.games.delete(msg.channel.id);

          if (reason === 'time') {
            gameOver = true;
            result = 'timeOut';
          } else if (reason === 'error') {
            gameOver = true;
            result = 'error';
          }

          gameEnd = Date.now();
          const finalEmbed = await getContent();
          await message.edit({ embeds: [finalEmbed], components: getButtons(true) });
        } catch (err) {
          this.client.logger.error(`Flood cleanup error: ${err}`);
        }
      });
    } catch (err) {
      this.client.games.delete(msg.channel.id);
      this.client.logger.error(`Flood: ${err}`);
      gameOver = true;
      result = 'error';
      const embed = await getContent();
      return message?.edit({ embeds: [embed], components: getButtons(gameOver) }).catch(() => {});
    }
  }
}

module.exports = FloodButtons;
