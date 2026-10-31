const { createCanvas, loadImage } = require('canvas');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const randomWords = require('random-words');

class TyperCompetition extends Command {
  constructor(client) {
    super(client, {
      name: 'typer-competition',
      description: 'See who can type the fastest',
      usage: 'typer-competition',
      category: 'Games',
      aliases: ['typercompetition', 'tc'],
    });
  }

  async run(msg) {
    const color = msg.settings.embedColor;

    const current = this.client.games.get(msg.channel.id);
    if (current) {
      return this.client.util.errorEmbed(msg, `Please wait until the current game of \`${current.name}\` is finished.`);
    }
    this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id, data: Date.now() });

    const randWord = randomWords(1).toString();
    const canvas = createCanvas(290, 80);
    const ctx = canvas.getContext('2d');
    ctx.font = '30px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    try {
      if (msg.guild?.members.me?.permissions.has('ManageMessages')) await msg.delete().catch(() => {});

      const em = new EmbedBuilder().setTitle('Typer Competition').setColor(color).setDescription(stripIndents`
        Who is the fastest? I will send a word, the person who types it the quickest wins!
        To start, two or more people must react with 🏁`);

      const embed1 = await msg.channel.send({ embeds: [em] });
      await embed1.react('🏁');

      const filter = (reaction, user) => reaction.emoji.name === '🏁' && !user.bot;
      try {
        await embed1.awaitReactions({ filter, max: 2, time: 60000, errors: ['time'] });
      } catch {
        return msg.channel.send('No one reacted in time');
      }

      const image = await loadImage('./resources/captcha-background-image.jpg');
      ctx.drawImage(image, 0, 0, 290, 80);
      ctx.fillText(randWord, 145, 40, 270);

      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'type-race.png' });
      const getReady = await msg.channel.send('Are you ready? \n3');
      await this.client.util.wait(1000);
      await getReady.edit('Are you ready? \n2');
      await this.client.util.wait(1000);
      await getReady.edit('Are you ready? \n1');
      await this.client.util.wait(1000);
      await getReady.edit('Go!');
      const theImage = await msg.channel.send({ files: [attachment] });
      getReady.delete().catch(() => {});

      const filter2 = (message) => message.content.toLowerCase() === randWord.toLowerCase();
      const collected = await msg.channel.awaitMessages({ filter: filter2, max: 1, time: 30000 });
      const winningMessage = collected.first();
      if (!winningMessage) return msg.channel.send('No one guessed the correct word in time.');

      const timeMs = winningMessage.createdAt - theImage.createdAt;
      const time = timeMs / 1000;
      const winner = winningMessage.author;
      let highScore = 0;
      let highScoreUser = 'Unknown';

      try {
        await this.client.db.execute(
          /* sql */
          `
            INSERT INTO
              game_scores (game_type, user_id, time_ms, guild_id)
            VALUES
              (?, ?, ?, ?)
          `,
          ['typer-competition', winner.id, timeMs, msg.guild?.id ?? null],
        );

        const [highScoreRows] = await this.client.db.execute(/* sql */
        `
          SELECT
            CAST(user_id AS CHAR) AS user_id,
            time_ms
          FROM
            game_scores
          WHERE
            game_type = 'typer-competition'
          ORDER BY
            time_ms ASC
          LIMIT
            1;
        `);

        const highScoreData = highScoreRows[0];
        highScore = highScoreData?.time_ms ?? 0;

        if (highScoreData?.user_id) {
          const highScoreUserObj =
            this.client.users.cache.get(highScoreData.user_id) ??
            (await this.client.users.fetch(highScoreData.user_id).catch((err) => {
              console.error('Failed to fetch typer-competition high-score user:', err);
              return null;
            }));
          highScoreUser = highScoreUserObj?.username ?? 'Unknown';
        }
      } catch (err) {
        console.error('Failed to save typer-competition score:', err);
      }

      const winnerEmbed = new EmbedBuilder()
        .setTitle('Winner!')
        .setColor(color)
        .setDescription(
          stripIndents`
          ${winner} won! :tada:
          Time: ${time.toFixed(2)} seconds`,
        )
        .addFields([{ name: 'High Score', value: `${(highScore / 1000).toFixed(2)} seconds by ${highScoreUser}` }]);
      return msg.channel.send({ embeds: [winnerEmbed] });
    } catch (err) {
      console.error('Typer competition failed:', err);
      return msg.channel.send('The typer competition ended unexpectedly.');
    } finally {
      this.client.games.delete(msg.channel.id);
    }
  }
}
module.exports = TyperCompetition;
