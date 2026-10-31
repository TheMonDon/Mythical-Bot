const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { Duration } = require('luxon');

class Flood extends Command {
  constructor(client) {
    super(client, {
      name: 'flood',
      description: 'Play a game of flood',
      usage: 'flood',
      category: 'Games',
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
    const color = msg.settings.embedColor;
    const gameStart = msg.createdAt;
    const gameBoard = [];
    let gameOver = false;
    let turn = 0;
    let lastMove;
    let message;
    let gameEnd;
    let result;
    let error;

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
    async function getContent(client) {
      let embed;
      if (gameOver === true) {
        const gameTimeMillis = gameEnd - gameStart;
        let gameTime;
        if (!isNaN(gameTimeMillis)) {
          gameTime = Duration.fromMillis(gameTimeMillis).shiftTo('minutes', 'seconds').toHuman();
        }
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
          await client.db.execute(
            /* sql */
            `
              INSERT INTO
                game_scores (game_type, user_id, score, time_ms, guild_id)
              VALUES
                (?, ?, ?, ?, ?)
            `,
            ['flood', msg.author.id, turn, gameTimeMillis, msg.guild?.id ?? null],
          );
        }

        const [HighScore] = await client.db.execute(/* sql */
        `
          SELECT
            CAST(user_id AS CHAR) AS user_id,
            score,
            time_ms,
            played_at
          FROM
            game_scores
          WHERE
            game_type = 'flood'
          ORDER BY
            score DESC,
            time_ms ASC
          LIMIT
            1;
        `);

        const highScoreData = HighScore[0];
        const highScoreUserId = highScoreData?.user_id;

        if (highScoreUserId) {
          const highScoreUserObj =
            client.users.cache.get(highScoreUserId) ??
            (await client.users.fetch(highScoreUserId).catch((err) => {
              console.error('Failed to fetch flood high-score user:', err);
              return null;
            }));

          highScoreUser = highScoreUserObj?.username ?? 'Unknown';
        } else {
          highScoreUser = 'Unknown';
        }

        highScore = highScoreData?.score ?? 0;
        highScoreTime = highScoreData?.time_ms ?? 0;
        if (!isNaN(highScoreTime)) {
          highScoreTime = Duration.fromMillis(highScoreTime).shiftTo('minutes', 'seconds').toHuman();
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

    try {
      const embed = await getContent(this.client);
      message = await msg.channel.send({ embeds: [embed] });
      ['🟥', '🟦', '🟧', '🟪', '🟩', '🛑'].forEach((s) => message.react(s));

      while (gameOver === false && turn < moves) {
        turn += 1;
        const current = gameBoard[0];
        const queue = [{ x: 0, y: 0 }];
        const visited = [];
        let selected = null;

        const filter = (reaction, user) => {
          return ['🟥', '🟦', '🟧', '🟪', '🟩', '🛑'].includes(reaction.emoji.name) && user.id === msg.author.id;
        };

        const embed = await getContent(this.client);
        message.edit({ embeds: [embed] });

        const collected = await message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] });
        if (!collected || !collected.first()) {
          gameOver = true;
          result = 'timeOut';
          this.client.games.delete(msg.channel.id);
          message.reactions.removeAll();
          const embed = await getContent(this.client);
          return message.edit({ embeds: [embed] });
        }

        collected
          .first()
          .users.remove(msg.author.id)
          .catch(() => {});
        selected = collected.first().emoji.name;

        if (selected === '🛑') {
          gameOver = true;
          result = 'earlyEnd';
          this.client.games.delete(msg.channel.id);
          message?.reactions?.removeAll();
          const embed = await getContent(this.client);
          return message.edit({ embeds: [embed] });
        } else if (selected === lastMove) {
          if (error) error.delete().catch(() => {});
          error = await msg.channel.send("You can't flood with the same color twice in a row!");
          continue;
        }
        lastMove = selected;

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

        if (error) error.delete().catch(() => {});
      }

      if (gameOver === true) {
        this.client.games.delete(msg.channel.id);
        message?.reactions?.removeAll();
        const embed = await getContent(this.client);
        return message.edit({ embeds: [embed] });
      }

      if (turn >= moves) {
        this.client.games.delete(msg.channel.id);
        message?.reactions?.removeAll();
        gameOver = true;
        result = 'maxTurns';
        const embed = await getContent(this.client);
        return message.edit({ embeds: [embed] });
      }

      this.client.games.delete(msg.channel.id);
      return msg.channel.send('Something went wrong, please try again later.');
    } catch (err) {
      this.client.games.delete(msg.channel.id);
      this.client.logger.error(`Flood: ${err}`);
      message?.reactions?.removeAll();
      gameOver = true;
      result = 'error';
      const embed = await getContent(this.client);

      return message.edit({ embeds: [embed] });
    }
  }
}

module.exports = Flood;
