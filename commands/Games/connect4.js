const Command = require('../../base/Command.js');
const { Connect4AI } = require('connect4-ai');
const { stripIndents } = require('common-tags');
const emojiRegex = require('emoji-regex/RGI_Emoji.js');
const { list, verify, getMember } = require('../../base/Util.js');
const blankEmoji = '⚪';
const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];
const customEmojiRegex = /^(?:<a?:([a-zA-Z0-9_]+):)?([0-9]+)>?$/;

class connect4 extends Command {
  constructor (client) {
    super(client, {
      name: 'connect4',
      description: 'Play a game of connect4.',
      usage: 'connect4 <opponent> <color>',
      category: 'Games',
      aliases: ['connectfour', 'connect-four']
    });
  }

  async run (msg, args) {
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
      coin: '🪙'
    };

    const usage = `Incorrect Usage: ${msg.settings.prefix}connect4 <opponent> <color>`;
    if (!args || args.length < 1) return msg.channel.send(usage);
    const opponent = getMember(msg, args[0]);
    if (!opponent) return msg.channel.send(usage);

    args.shift();
    if (!args || args.length < 1) return msg.channel.send(`${usage} \nThat is not a valid color, either an emoji or one of ${list(Object.keys(colors), 'or')}.`);

    function checkLine (a, b, c, d) {
      return (a !== null) && (a === b) && (a === c) && (a === d);
    }

    function verifyWin (bd) {
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

    function generateBoard () {
      const arr = [];
      for (let i = 0; i < 6; i++) {
        arr.push([null, null, null, null, null, null, null]);
      }
      return arr;
    }

    function displayBoard (board, playerOneEmoji, playerTwoEmoji) {
      return board.map(row => row.map(piece => {
        if (piece === 'user') return playerOneEmoji;
        if (piece === 'oppo') return playerTwoEmoji;
        return blankEmoji;
      }).join('')).join('\n');
    }

    let color = args[0];
    if (validate(color, msg) !== true) return;
    color = parse(color, msg);

    function validate (color, msg) {
      const hasEmoji = new RegExp(`^(?:${emojiRegex().source})$`).test(color);
      const hasCustom = color.match(customEmojiRegex);
      if (hasCustom && !msg.guild) return msg.channel.send('You can only use custom emoji in a server.');
      if (hasCustom && msg.guild && !msg.guild.emojis.cache.has(hasCustom[2])) {
        return msg.channel.send('You can only use custom emoji from this server.');
      }
      if (!hasCustom && !hasEmoji && !colors[color.toLowerCase()]) {
        return msg.channel.send(`Please enter an emoji or one of the following: ${list(Object.keys(colors), 'or')}.`);
      }
      if (color === blankEmoji) return msg.channel.send('You cannot use this emoji.');
      return true;
    }
    function parse (color, msg) {
      const hasCustom = color.match(customEmojiRegex);
      if (hasCustom && msg.guild) return msg.guild.emojis.cache.get(hasCustom[2]).toString();
      return colors[color.toLowerCase()] || color;
    }

    const current = this.client.games.get(msg.channel.id);
    if (current) return msg.reply(`Please wait until the current game of \`${current.name}\` is finished.`);
    this.client.games.set(msg.channel.id, { name: this.help.name });

    if (opponent.id === msg.author.id) return msg.reply('You may not play against yourself.');

    const playerOneEmoji = color;
    let playerTwoEmoji = color === colors.yellow ? colors.red : colors.yellow;
    try {
      const available = Object.keys(colors).filter(clr => color !== colors[clr]);
      if (opponent.user.bot) {
        playerTwoEmoji = colors[available[Math.floor(Math.random() * available.length)]];
      } else {
        await msg.channel.send(`${opponent}, do you accept this challenge?`);
        const verification = await verify(msg.channel, opponent);
        if (!verification) {
          this.client.games.delete(msg.channel.id);
          return msg.channel.send('Looks like they declined...');
        }
        await msg.channel.send(`${opponent}, what color do you want to be? Either an emoji or one of ${list(available, 'or')}.`);
        const filter = res => {
          if (res.author.id !== opponent.id) return false;
          if (res.content === blankEmoji) return false;
          const hasEmoji = new RegExp(`^(?:${emojiRegex().source})$`).test(res.content);
          const hasCustom = res.content.match(customEmojiRegex);
          if (hasCustom && msg.guild && !msg.guild.emojis.cache.has(hasCustom[2])) return false;
          return (hasCustom && msg.guild) || hasEmoji || available.includes(res.content.toLowerCase());
        };
        const p2Color = await msg.channel.awaitMessages(filter, {
          max: 1,
          time: 30000
        });
        if (p2Color.size) {
          const choice = p2Color.first().content.toLowerCase();
          const hasCustom = choice.match(customEmojiRegex);
          hasCustom && msg.guild ? playerTwoEmoji = msg.guild.emojis.cache.get(hasCustom[2]).toString() : playerTwoEmoji = colors[choice] || choice;
        }
      }
      const AIEngine = new Connect4AI();
      const board = generateBoard();
      let userTurn = true;
      let winner = null;
      const colLevels = [5, 5, 5, 5, 5, 5, 5];
      let lastMove = 'None';
      let message = 0;
      while (!winner && board.some(row => row.includes(null))) {
        const user = userTurn ? msg.author : opponent;
        const sign = userTurn ? 'user' : 'oppo';
        let i = 0;
        if (opponent.user.bot && !userTurn) {
          i = AIEngine.playAI('hard');
          lastMove = i + 1;
        } else {
          const emoji = userTurn ? playerOneEmoji : playerTwoEmoji;
          if (message === 0) {
            message = await msg.channel.send(stripIndents`
            ${emoji} ${user}, which column do you pick? Type \`end\` to forfeit.
            Can't think of a move? Use \`play for me\`.
            ${opponent.user.bot ? `I placed mine in **${lastMove}**.` : `Previous Move: **${lastMove}**`}
            ${displayBoard(board, playerOneEmoji, playerTwoEmoji)}
            ${nums.join('')}
          `);
          }
          await message.edit(stripIndents`
            ${emoji} ${user}, which column do you pick? Type \`end\` to forfeit.
            Can't think of a move? Use \`play for me\`.
            ${opponent.user.bot ? `I placed mine in **${lastMove}**.` : `Previous Move: **${lastMove}**`}
            ${displayBoard(board, playerOneEmoji, playerTwoEmoji)}
            ${nums.join('')}
          `);
          const pickFilter = res => {
            if (res.author.id !== user.id) return false;
            const choice = res.content;
            if (choice.toLowerCase() === 'end') return true;
            if (choice.toLowerCase() === 'play for me') return true;
            const j = Number.parseInt(choice, 10) - 1;
            return board[colLevels[j]] && board[colLevels[j]][j] !== undefined;
          };
          const turn = await msg.channel.awaitMessages(pickFilter, {
            max: 1,
            time: 60000
          });
          const choice = turn.size ? turn.first().content : null;
          if (!choice) {
            await msg.channel.send('Sorry, time is up! I\'ll pick their move for them.');
            i = AIEngine.playAI('hard');
            lastMove = i + 1;
          } else if (choice.toLowerCase() === 'end') {
            winner = userTurn ? opponent : msg.author;
            break;
          } else if (choice.toLowerCase() === 'play for me') {
            i = AIEngine.playAI('hard');
            lastMove = i + 1;
            if (msg.guild.me.permissions.has('MANAGE_MESSAGES')) turn.first().delete();
          } else {
            i = Number.parseInt(choice, 10) - 1;
            AIEngine.play(i);
            lastMove = i + 1;
            if (msg.guild.me.permissions.has('MANAGE_MESSAGES')) turn.first().delete();
          }
        }
        board[colLevels[i]][i] = sign;
        colLevels[i]--;
        if (verifyWin(board)) winner = userTurn ? msg.author : opponent;
        userTurn = !userTurn;
      }
      this.client.games.delete(msg.channel.id);
      message.delete();
      if (winner === 'time') return msg.channel.send('Game ended due to inactivity.');
      return msg.channel.send(stripIndents`
        ${winner ? `Congrats, ${winner}!` : 'Looks like it\'s a draw...'}
        Final Move: **${lastMove}**
        ${displayBoard(board, playerOneEmoji, playerTwoEmoji)}
        ${nums.join('')}
      `);
    } catch (err) {
      this.client.games.delete(msg.channel.id);
      throw err;
    }
  }
}

module.exports = connect4;
