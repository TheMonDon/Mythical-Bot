const Command = require('../../base/Command.js');
const tictactoe = require('tictactoe-minimax-ai');
const { stripIndents } = require('common-tags');
const { verify, getMember } = require('../../util/Util.js');
const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

class TicTacToe extends Command {
  constructor (client) {
    super(client, {
      name: 'tic-tac-toe',
      description: 'Play a game of tic-tac-toe with another user or the AI.',
      usage: 'tictactoe <member>',
      category: 'Games',
      aliases: ['ttt', 'tictactoe']
    });
  }

  async run (msg, args) {
    const current = this.client.games.get(msg.channel.id);
    if (current) return msg.reply(`Please wait until the current game of \`${current.name}\` is finished.`);
    this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id, date: Date.now() });

    if (!args || args.length < 1) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}tic-tac-toe <member>`);

    const opponent = getMember(msg, args.join(' '));
    if (opponent.id === msg.author.id) return msg.reply('You may not play against yourself.');

    function verifyWin (sides, player1, player2) {
      const evaluated = tictactoe.boardEvaluate(convertBoard(sides)).status;
      if (evaluated === 'win') return player1;
      if (evaluated === 'loss') return player2;
      if (evaluated === 'tie') return 'tie';
      return false;
    }

    function convertBoard (board) {
      const newBoard = [[], [], []];
      let col = 0;
      for (const piece of board) {
        if (piece === 'X') {
          newBoard[col].push('x');
        } else if (piece === 'O') {
          newBoard[col].push('o');
        } else {
          newBoard[col].push('_');
        }
        if (newBoard[col].length === 3) col++;
      }
      return newBoard;
    }

    function displayBoard (board) {
      let str = '';
      for (let i = 0; i < board.length; i++) {
        if (board[i] === 'X') {
          str += '❌';
        } else if (board[i] === 'O') {
          str += '⭕';
        } else {
          str += nums[i];
        }
        if (i % 3 === 2) str += '\n';
      }
      return str;
    }

    try {
      if (!opponent.user.bot) {
        await msg.channel.send(`${opponent}, do you accept this challenge?`);
        const verification = await verify(msg.channel, opponent);
        if (!verification) {
          this.client.games.delete(msg.channel.id);
          return msg.channel.send('Looks like they declined...');
        }
      }
      const sides = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const taken = [];
      let userTurn = true;
      let winner = null;
      let lastTurnTimeout = false;
      let message = 0;
      while (!winner && taken.length < 9) {
        const user = userTurn ? msg.author : opponent;
        const sign = userTurn ? 'X' : 'O';
        let choice;
        if (opponent.user.bot && !userTurn) {
          choice = tictactoe.bestMove(convertBoard(sides), { computer: 'o', opponent: 'x' });
        } else {
          if (message === 0) {
            message = await msg.channel.send(stripIndents`
            ${user}, which side do you pick? Type \`end\` to forfeit.
            ${displayBoard(sides)}
          `);
          }
          await message.edit(stripIndents`
            ${user}, which side do you pick? Type \`end\` to forfeit.
            ${displayBoard(sides)}
          `);
          const filter = res => {
            if (res.author.id !== user.id) return false;
            const pick = res.content;
            if (pick.toLowerCase() === 'end') return true;
            return sides.includes(pick) && !taken.includes(pick);
          };
          const turn = await msg.channel.awaitMessages({
            filter,
            max: 1,
            time: 30000
          });
          if (!turn.size) {
            await msg.channel.send('Sorry, time is up!');
            if (lastTurnTimeout) {
              winner = 'time';
              break;
            } else {
              userTurn = !userTurn;
              lastTurnTimeout = true;
              continue;
            }
          }
          choice = turn.first().content;
          if (choice.toLowerCase() === 'end') {
            winner = userTurn ? opponent : msg.author;
            break;
          }
          if (msg.guild.me.permissions.has('MANAGE_MESSAGES')) turn.first().delete();
        }
        sides[opponent.user.bot && !userTurn ? choice : Number.parseInt(choice, 10) - 1] = sign;
        taken.push(choice);
        const win = verifyWin(sides, msg.author, opponent);
        if (win) winner = win;
        if (lastTurnTimeout) lastTurnTimeout = false;
        userTurn = !userTurn;
      }
      this.client.games.delete(msg.channel.id);
      if (winner === 'time') return msg.channel.send('Game ended due to inactivity.');
      return message.edit(stripIndents`
        ${winner === 'tie' ? 'Oh... The cat won.' : `Congrats, ${winner}!`}
        ${displayBoard(sides)}
      `);
    } catch (err) {
      this.client.games.delete(msg.channel.id);
      msg.channel.send(`An error has occured: ${err}`);
    }
  }
}
module.exports = TicTacToe;
