const tictactoe = require('tictactoe-minimax-ai');
const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

class TicTacToe extends Command {
  constructor(client) {
    super(client, {
      name: 'tic-tac-toe',
      description: 'Play a game of tic-tac-toe with another user or the bot',
      usage: 'tic-tac-toe <member>',
      requiredArgs: 1,
      category: 'Games',
      aliases: ['ttt', 'tictactoe'],
    });
  }

  async run(msg, args) {
    const current = this.client.games.get(msg.channel.id);
    if (current) {
      return this.client.util.errorEmbed(msg, `Please wait until the current game of \`${current.name}\` is finished.`);
    }

    const opponent = await this.client.util.getMember(msg, args.join(' '));
    if (!opponent) {
      return this.client.util.errorEmbed(msg, 'Member not found');
    }
    if (opponent.id === msg.author.id) {
      return msg.channel.send('You may not play against yourself.');
    }

    this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id });

    function verifyWin(sides, player1, player2) {
      const evaluated = tictactoe.boardEvaluate(convertBoard(sides)).status;
      if (evaluated === 'win') return player1;
      if (evaluated === 'loss') return player2;
      if (evaluated === 'tie') return 'tie';
      return false;
    }

    function convertBoard(board) {
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

    function displayBoard(board) {
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
        const verification = await this.client.util.verify(msg.channel, opponent);
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

      let currentUser = msg.author;
      let turn = 1;

      const message = await msg.channel.send(stripIndents`
        ${currentUser}, which side do you pick? Type \`end\` to forfeit.
        ${displayBoard(sides)}
      `);

      while (!winner && taken.length < 9) {
        let sign, choice;

        if (turn === 1) {
          currentUser = msg.author;
          sign = 'X';
        } else {
          currentUser = opponent;
          sign = 'O';
        }

        if (opponent.user.bot && !userTurn) {
          choice = tictactoe.bestMove(convertBoard(sides), { computer: 'o', opponent: 'x' });
        } else {
          await message.edit(stripIndents`
            ${currentUser}, which side do you pick? Type \`end\` to forfeit.
            ${displayBoard(sides)}
          `);

          const filter = (res) => {
            if (res.author.id !== currentUser.id) return false;
            const pick = res.content;
            if (pick.toLowerCase() === 'end') return true;
            return sides.includes(pick) && !taken.includes(pick);
          };

          const collected = await msg.channel.awaitMessages({
            filter,
            max: 1,
            time: 30000,
          });

          if (!collected.size) {
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

          choice = collected.first().content;
          if (choice.toLowerCase() === 'end') {
            winner = userTurn ? opponent : msg.author;
            break;
          }
          if (msg.guild.members.me.permissions.has('ManageMessages')) collected.first().delete();
        }

        sides[opponent.user.bot && !userTurn ? choice : Number.parseInt(choice, 10) - 1] = sign;
        taken.push(choice);
        const win = verifyWin(sides, msg.author, opponent);
        if (win) winner = win;
        if (lastTurnTimeout) lastTurnTimeout = false;
        userTurn = !userTurn;

        turn === 1 ? (turn = 2) : (turn = 1);
      }

      this.client.games.delete(msg.channel.id);
      if (winner === 'time') return msg.channel.send('Game ended due to inactivity.');

      return message.edit(stripIndents`
        ${winner === 'tie' ? 'Oh... The cat won.' : `Congrats, ${winner}!`}
        ${displayBoard(sides)}
      `);
    } catch (err) {
      this.client.games.delete(msg.channel.id);
      return msg.channel.send(`An error has occurred: ${err}`);
    }
  }
}

module.exports = TicTacToe;
