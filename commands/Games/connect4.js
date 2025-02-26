const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
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
      description: 'Play a game of connect-four',
      usage: 'connect-four [opponent] <color>',
      category: 'Games',
      aliases: ['connectfour', 'connect4', 'c4'],
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
    if (current) return msg.channel.send(`Please wait until the current game of \`${current.name}\` is finished.`);

    let opponent = msg.guild.members.me;
    if (opponent.id === msg.author.id) return msg.channel.send("You can't play against yourself.");

    // Check if they provided user and color, get a user
    if (args && args.length === 2) {
      opponent = await this.client.util.getMember(msg, args[0]);
      if (!opponent) opponent = msg.guild.members.me;
      args.shift();
    } else if (!args || args.length < 1) {
      return msg.channel.send(
        `${
          msg.settings.prefix + this.help.usage
        } \nThat is not a valid color, either an emoji or one of ${this.client.util.list(Object.keys(colors), 'or')}.`,
      );
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

    const client = this.client;
    function validate(color, msg) {
      const hasEmoji = new RegExp(`^(?:${emojiRegex().source})$`).test(color);
      const hasCustom = color.match(customEmojiRegex);
      if (hasCustom && !msg.guild) return msg.channel.send('You can only use custom emojis in a server.');
      if (hasCustom && msg.guild && !msg.guild.emojis.cache.has(hasCustom[2]))
        return msg.channel.send('You can only use custom emojis from this server.');
      if (!hasCustom && !hasEmoji && !colors[color.toLowerCase()]) {
        return msg.channel.send(
          `Sorry that is not valid, please use an emoji or one of the following: ${client.util.list(
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
          if (res.author.id !== opponent.user.id) return false;
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
      const playerOne = msg.member.user;
      const playerTwo = opponent.user;
      const board = generateBoard();
      let lastMove = 'None';
      let winner = null;

      // Global var for updating the collected interaction
      let collected;
      // 1 = playerOne, 2 = playerTwo
      let turn = 1;

      async function getButtons(gameOver) {
        // Create buttons for emoji 1-7 and stop playing button
        const one = new ButtonBuilder().setCustomId('1').setEmoji('1️⃣').setStyle(ButtonStyle.Secondary);
        const two = new ButtonBuilder().setCustomId('2').setEmoji('2️⃣').setStyle(ButtonStyle.Secondary);
        const three = new ButtonBuilder().setCustomId('3').setEmoji('3️⃣').setStyle(ButtonStyle.Secondary);
        const four = new ButtonBuilder().setCustomId('4').setEmoji('4️⃣').setStyle(ButtonStyle.Secondary);
        const five = new ButtonBuilder().setCustomId('5').setEmoji('5️⃣').setStyle(ButtonStyle.Secondary);
        const six = new ButtonBuilder().setCustomId('6').setEmoji('6️⃣').setStyle(ButtonStyle.Secondary);
        const seven = new ButtonBuilder().setCustomId('7').setEmoji('7️⃣').setStyle(ButtonStyle.Secondary);
        const stop = new ButtonBuilder().setCustomId('stop').setEmoji('🛑').setStyle(ButtonStyle.Danger);

        if (gameOver) {
          // If the game ends disable all buttons
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

        // Return the object of both rows, since rows can only have 5 buttons max
        return [row1, row2];
      }

      // Function to get the message for user and game board, add in the buttons and return the object for the message
      async function getContent(currentUser, opponentUser, opponentEmoji, currentEmoji) {
        // This should be currentUser but its not working, opponentUser is the correct user.
        let content = `${opponentEmoji} ${opponentUser}, which column do you pick?`;
        let move = `Previous Move: **${lastMove}**`;
        let displayName = opponentUser.displayName;

        // Replace content and move if the game is over
        if (AIEngine.gameStatus().gameOver) {
          content = winner ? `Congrats, ${winner}!` : "Looks like it's a draw...";
          move = `Final Move: **${lastMove}**`;
          displayName = currentUser.displayName;
        } else if (opponentUser.bot) {
          content = '';
          move = `I placed mine in **${lastMove}**.`;
        }

        const embed = new EmbedBuilder()
          .setTitle(`${displayName}'s Turn`)
          .setColor(msg.settings.embedColor)
          .setDescription(
            stripIndents`
              ${move}
              ${displayBoard(board, playerOneEmoji, playerTwoEmoji)}
              ${nums.join('')}
            `,
          );

        const buttons = await getButtons(AIEngine.gameStatus().gameOver);

        // Return an object without content built in so it doesn't edit a space
        if (!content) return { embeds: [embed], components: buttons };
        return { content, embeds: [embed], components: buttons };
      }

      // The getContent function is messed up, playerOne and playerTwo need to be switched here to be correct
      const originalContent = await getContent(playerTwo, playerOne, playerOneEmoji, playerTwoEmoji);
      const message = await msg.channel.send(originalContent).catch(console.error);

      let currentUser;
      let opponentUser;
      let currentEmoji;
      let opponentEmoji;

      while (!AIEngine.gameStatus().gameOver && board.some((row) => row.includes(null))) {
        let sign;
        if (turn === 1) {
          currentUser = playerOne;
          opponentUser = playerTwo;
          currentEmoji = playerOneEmoji;
          opponentEmoji = playerTwoEmoji;
          sign = 'user';
        } else {
          currentUser = playerTwo;
          opponentUser = playerOne;
          currentEmoji = playerTwoEmoji;
          opponentEmoji = playerOneEmoji;
          sign = 'oppo';
        }
        let i = 0;

        // AI plays anytime the player is playing with a bot.
        if (currentUser.bot) {
          i = AIEngine.playAI('hard');
          lastMove = i + 1;

          // Update board
          board[colLevels[i]][i] = sign;
          colLevels[i]--;

          // Send updated message
          const content = await getContent(currentUser, opponentUser, opponentEmoji, currentEmoji);
          await collected.editReply(content).catch(console.error);

          if (AIEngine.winner) {
            winner = currentUser;
            break;
          }
          turn === 1 ? (turn = 2) : (turn = 1);

          continue;
        }

        // Await a player pressing a button for 60 seconds
        collected = await message
          .awaitMessageComponent({
            filter: (i) => i.deferUpdate(),
            time: 60_000,
          })
          .catch(() => {});

        if (!collected) {
          // They never pressed the button, end the game due to time and edit the message directly since collected doesn't exist
          AIEngine.gameOver = true;
          winner = 'time';
          this.client.games.delete(msg.channel.id);

          const content = await getContent(currentUser, opponentUser, opponentEmoji, currentEmoji);
          return await message.edit(content).catch(console.error);
        }

        const interactionUser = collected.user;
        if (interactionUser.id !== currentUser.id) {
          await collected
            .followUp({ content: "These buttons aren't for you!", flags: MessageFlags.Ephemeral })
            .catch(console.error);
          continue;
        }

        const selectedColumn = collected.customId;

        if (!selectedColumn) {
          await msg.channel.send("Sorry, time is up! I'll pick their move for them.").then((msg1) => {
            setTimeout(() => msg1.delete(), 10000);
          });
          i = AIEngine.playAI('hard');
          lastMove = i + 1;
        } else if (selectedColumn.toLowerCase() === 'stop') {
          // The player pressed the stop sign, stop the game and let the other person win.
          winner = opponentUser;
          AIEngine.gameOver = true;
          break;
        } else {
          i = Number.parseInt(selectedColumn, 10) - 1;
          // Check if the move is valid
          if (!AIEngine.canPlay(i)) {
            await collected
              .followUp({ content: 'That is not a valid move, please try again.', ephemeral: true })
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

        // Check if the last move made them a winner, stop the game
        if (AIEngine.winner) {
          winner = currentUser;
          break;
        }

        // Send updated message
        const content = await getContent(currentUser, opponentUser, opponentEmoji, currentEmoji);
        await collected.editReply(content).catch(console.error);

        // Change turn to the opposite of what it is
        turn === 1 ? (turn = 2) : (turn = 1);
      }

      // Delete the game and set content to function rather than pasting it three times
      this.client.games.delete(msg.channel.id);
      const content = await getContent(currentUser, opponentUser, opponentEmoji, currentEmoji);

      // Announce winner
      if (winner === 'time') {
        await collected.editReply(content).catch(console.error);
        return msg.channel.send('Game ended due to inactivity.');
      }

      // Check if the game ever played so we can edit the interaction, or just edit the message
      if (collected) return collected.editReply(content).catch(console.error);

      return message.edit(content).catch(console.error);
    } catch (err) {
      // An error occurred, delete the game and send the error to chat.
      this.client.games.delete(msg.channel.id);
      msg.channel.send(err).catch(console.error);
    }
  }
}

module.exports = Connect4;
