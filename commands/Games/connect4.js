const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const customEmojiRegex = /^(?:<a?:([a-zA-Z0-9_]+):)?([0-9]+)>?$/;
const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];
const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { Connect4AI } = require('connect4-ai');
const emojiRegex = require('emoji-regex');
const blankEmoji = '⚪';

class Connect4 extends Command {
  constructor(client) {
    super(client, {
      name: 'connect-four',
      description: 'Play a game of connect-four.',
      usage: 'connect-four [opponent] <color>',
      category: 'Games',
      aliases: ['connectfour', 'connect4'],
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const colors = {
      red: '🔴',
      yellow: '🟡',
      blue: '🔵',
      brown: '🟤',
      green: '🟢',
      orange: '🟠',
      purple: '🟣',
      black: '⚫',
      moon: '🌘',
      earth: '🌎',
      riceball: '🍙',
      cookie: '🍪',
      baseball: '⚾',
      softball: '🥎',
      tennisball: '🎾',
      volleyball: '🏐',
      basketball: '🏀',
      soccerball: '⚽',
      '8ball': '🎱',
      cd: '💿',
      dvd: '📀',
      clock: '🕓',
      coin: '🪙',
    };

    const current = this.client.games.get(msg.channel.id);
    if (current) return msg.reply(`Please wait until the current game of \`${current.name}\` is finished.`);

    let opponent = await this.client.util.getMember(msg, args[0]);
    if (!opponent) opponent = msg.guild.members.me;
    if (opponent.id === msg.author.id) return msg.reply('You may not play against yourself.');

    if (args && args.length === 2) args.shift();
    if (!args || args.length < 1) {
      return msg.channel.send(
        `${
          msg.settings.prefix + this.help.usage
        } \nThat is not a valid color, either an emoji or one of ${this.client.util.list(Object.keys(colors), 'or')}.`,
      );
    }

    function checkLine(a, b, c, d) {
      return a !== null && a === b && a === c && a === d;
    }

    function verifyWin(bd) {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 7; c++) {
          if (checkLine(bd[r][c], bd[r + 1][c], bd[r + 2][c], bd[r + 3][c])) return bd[r][c];
        }
      }
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 4; c++) {
          if (checkLine(bd[r][c], bd[r][c + 1], bd[r][c + 2], bd[r][c + 3])) return bd[r][c];
        }
      }
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          if (checkLine(bd[r][c], bd[r + 1][c + 1], bd[r + 2][c + 2], bd[r + 3][c + 3])) return bd[r][c];
        }
      }
      for (let r = 3; r < 6; r++) {
        for (let c = 0; c < 4; c++) {
          if (checkLine(bd[r][c], bd[r - 1][c + 1], bd[r - 2][c + 2], bd[r - 3][c + 3])) return bd[r][c];
        }
      }
      return null;
    }

    function generateBoard() {
      const arr = [];
      for (let i = 0; i < 6; i++) {
        arr.push([null, null, null, null, null, null, null]);
      }
      return arr;
    }

    function displayBoard(board, playerOneEmoji, playerTwoEmoji) {
      return board
        .map((row) =>
          row
            .map((piece) => {
              if (piece === 'user') return playerOneEmoji;
              if (piece === 'oppo') return playerTwoEmoji;
              return blankEmoji;
            })
            .join(''),
        )
        .join('\n');
    }

    function validate(color, msg) {
      const hasEmoji = new RegExp(`^(?:${emojiRegex().source})$`).test(color);
      const hasCustom = color.match(customEmojiRegex);
      if (hasCustom && !msg.guild) return msg.channel.send('You can only use custom emojis in a server.');
      if (hasCustom && msg.guild && !msg.guild.emojis.cache.has(hasCustom[2]))
        return msg.channel.send('You can only use custom emojis from this server.');
      if (!hasCustom && !hasEmoji && !colors[color.toLowerCase()]) {
        return msg.channel.send(
          `Sorry that is not valid, please use an emoji or one of the following: ${this.client.util.list(
            Object.keys(colors),
            'or',
          )}.`,
        );
      }
      if (color === blankEmoji) return msg.channel.send('You cannot use that emoji.');
      return true;
    }

    function parse(color, msg) {
      const hasCustom = color.match(customEmojiRegex);
      if (hasCustom && msg.guild) return msg.guild.emojis.cache.get(hasCustom[2]).toString();
      return colors[color.toLowerCase()] || color;
    }

    let color = args[0];
    if (validate(color, msg) !== true) return;
    color = parse(color, msg);

    const playerOneEmoji = color;
    let playerTwoEmoji = colors.yellow;
    if (color === colors.yellow) playerTwoEmoji = colors.red;

    try {
      const available = Object.keys(colors).filter((clr) => color !== colors[clr]);

      if (opponent.user.bot) {
        playerTwoEmoji = colors[available[Math.floor(Math.random() * available.length)]];
      } else {
        // Check with opponent if they want to play
        await msg.channel.send(`${opponent}, do you accept this challenge?`);
        const verification = await this.client.util.verify(msg.channel, opponent);
        if (!verification) {
          this.client.games.delete(msg.channel.id);
          return msg.channel.send('Looks like they declined...');
        }

        // Get opponent's color
        await msg.channel.send(
          `${opponent}, what color do you want to be? Either an emoji or one of ${this.client.util.list(
            available,
            'or',
          )}.`,
        );

        const filter = (res) => {
          if (res.author.id !== opponent.id) return false;
          if (res.content === blankEmoji) return false;
          const hasEmoji = new RegExp(`^(?:${emojiRegex().source})$`).test(res.content);
          const hasCustom = res.content.match(customEmojiRegex);
          if (hasCustom && msg.guild && !msg.guild.emojis.cache.has(hasCustom[2])) return false;
          return (hasCustom && msg.guild) || hasEmoji || available.includes(res.content.toLowerCase());
        };

        const p2Color = await msg.channel.awaitMessages({
          filter,
          max: 1,
          time: 30000,
        });

        if (p2Color.size) {
          const choice = p2Color.first().content.toLowerCase();
          const hasCustom = choice.match(customEmojiRegex);
          hasCustom && msg.guild
            ? (playerTwoEmoji = msg.guild.emojis.cache.get(hasCustom[2]).toString())
            : (playerTwoEmoji = colors[choice] || choice);
        }
      }

      this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id });

      // Create the game
      const colLevels = [5, 5, 5, 5, 5, 5, 5];
      const AIEngine = new Connect4AI();
      const board = generateBoard();
      let emoji = playerOneEmoji;
      let lastMove = 'None';
      let user = msg.member.user;
      let gameOver = false;
      let userTurn = true;
      let winner = null;
      let collected;

      function getButtons() {
        const one = new ButtonBuilder().setCustomId('1').setEmoji('1️⃣').setStyle(ButtonStyle.Secondary);
        const two = new ButtonBuilder().setCustomId('2').setEmoji('2️⃣').setStyle(ButtonStyle.Secondary);
        const three = new ButtonBuilder().setCustomId('3').setEmoji('3️⃣').setStyle(ButtonStyle.Secondary);
        const four = new ButtonBuilder().setCustomId('4').setEmoji('4️⃣').setStyle(ButtonStyle.Secondary);
        const five = new ButtonBuilder().setCustomId('5').setEmoji('5️⃣').setStyle(ButtonStyle.Secondary);
        const six = new ButtonBuilder().setCustomId('6').setEmoji('6️⃣').setStyle(ButtonStyle.Secondary);
        const seven = new ButtonBuilder().setCustomId('7').setEmoji('7️⃣').setStyle(ButtonStyle.Secondary);
        const stop = new ButtonBuilder().setCustomId('stop').setEmoji('🛑').setStyle(ButtonStyle.Danger);

        if (gameOver) {
          one.setDisabled(true);
          two.setDisabled(true);
          three.setDisabled(true);
          four.setDisabled(true);
          five.setDisabled(true);
          six.setDisabled(true);
          seven.setDisabled(true);
          stop.setDisabled(true);
        }

        const row1 = new ActionRowBuilder().addComponents(one, two, three, four, five);
        const row2 = new ActionRowBuilder().addComponents(six, seven, stop);

        return [row1, row2];
      }

      function getContent() {
        let content = `${emoji} ${user}, which column do you pick?`;

        if (gameOver) content = winner ? `Congrats, ${winner}!` : "Looks like it's a draw...";

        let move = opponent.user.bot ? `I placed mine in **${lastMove}**.` : `Previous Move: **${lastMove}**`;
        if (gameOver) {
          move = `Final Move: **${lastMove}**`;
        }
        const embed = new EmbedBuilder()
          .setTitle(`${user.displayName}'s Turn`)
          .setColor(msg.settings.embedColor)
          .setDescription(
            stripIndents`
        ${move}
        ${displayBoard(board, playerOneEmoji, playerTwoEmoji)}
        ${nums.join('')}
        `,
          );

        return { content, embeds: [embed], components: getButtons() };
      }

      const message = await msg.channel.send(getContent()).catch(console.error);

      while (!gameOver && board.some((row) => row.includes(null))) {
        user = userTurn ? msg.member.user : opponent.user;
        const sign = userTurn ? 'user' : 'oppo';
        let i = 0;

        if (opponent.user.bot && !userTurn) {
          i = AIEngine.playAI('hard');
          lastMove = i + 1;

          // Update board
          board[colLevels[i]][i] = sign;
          colLevels[i]--;

          // Send updated message
          collected.editReply(getContent()).catch(console.error);

          if (verifyWin(board)) {
            winner = user;
            gameOver = true;
          }
          userTurn = !userTurn;

          continue;
        }
        emoji = userTurn ? playerOneEmoji : playerTwoEmoji;

        collected = await message
          .awaitMessageComponent({
            filter: (i) => i.deferUpdate(),
            time: 60_000,
          })
          .catch(() => {});

        if (!collected) {
          gameOver = true;
          winner = 'time';
          this.client.games.delete(msg.channel.id);

          return message.edit(getContent()).catch(console.error);
        }

        const interactionUser = collected.user;
        if (interactionUser.id !== user.id) {
          await collected.followUp({ content: `These buttons aren't for you!`, ephemeral: true }).catch(console.error);
          continue;
        }

        const choice = collected.customId;

        if (!choice) {
          await msg.channel.send("Sorry, time is up! I'll pick their move for them.").then((msg1) => {
            setTimeout(() => msg1.delete(), 10000);
          });
          i = AIEngine.playAI('hard');
          lastMove = i + 1;
        } else if (choice.toLowerCase() === 'stop') {
          winner = user;
          gameOver = true;
          break;
        } else {
          i = Number.parseInt(choice, 10) - 1;
          // Check if the move is valid
          if (!AIEngine.canPlay(i)) {
            await collected
              .editReply({ content: 'That is not a valid move, please try again.', ephemeral: true })
              .catch(console.error);
            continue;
          } else {
            AIEngine.play(i);
          }
          lastMove = i + 1;
        }

        // Update board
        board[colLevels[i]][i] = sign;
        colLevels[i]--;

        // Send updated message
        collected.editReply(getContent()).catch(console.error);

        if (verifyWin(board)) {
          winner = user;
          gameOver = true;
          break;
        }
        userTurn = !userTurn;
      }

      this.client.games.delete(msg.channel.id);

      // Announce winner
      if (winner === 'time') {
        collected.editReply(getContent()).catch(console.error);
        return msg.channel.send('Game ended due to inactivity.');
      }
      if (collected) {
        return collected.editReply(getContent()).catch(console.error);
      }
      return message.edit(getContent()).catch(console.error);
    } catch (err) {
      this.client.games.delete(msg.channel.id);
      msg.channel.send(err).catch(console.error);
    }
  }
}

module.exports = Connect4;
