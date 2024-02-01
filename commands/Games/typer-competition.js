const { registerFont, createCanvas, loadImage } = require('canvas');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const randomWords = require('random-words');
const { QuickDB } = require('quick.db');
const https = require('https');
const db = new QuickDB();
const fs = require('fs');

class TyperCompetition extends Command {
  constructor(client) {
    super(client, {
      name: 'typer-competition',
      description: 'See who can type the fastest.',
      usage: 'Typer-Competition',
      category: 'Games',
      aliases: ['typercompetition', 'tc'],
    });
  }

  async run(msg) {
    const color = msg.settings.embedColor;

    const current = this.client.games.get(msg.channel.id);
    if (current) return msg.reply(`Please wait until the current game of \`${current.name}\` is finished.`);
    this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id, data: Date.now() });

    const randWord = randomWords(1).toString();

    registerFont('./resources/fonts/Moms_Typewriter.ttf', {
      family: 'Moms Typewriter',
    });

    const canvas = createCanvas(290, 80);
    const ctx = canvas.getContext('2d');
    ctx.font = '18px "Moms Typewriter';

    if (msg.guild.members.me.permissions.has('ManageMessages')) msg.delete();

    const em = new EmbedBuilder().setTitle('Typer Competition').setColor(color).setDescription(stripIndents`
      Who is the fastest? I will send a word, the person who types it the quickest wins!
      To start, two or more people must react with 🏁`);

    const embed1 = await msg.channel.send({ embeds: [em] });
    await embed1.react('🏁');

    const filter = (reaction, user) => {
      return reaction.emoji.name === '🏁' && !user.bot;
    };

    embed1
      .awaitReactions({
        filter,
        max: 2,
        time: 60000,
        errors: ['time'],
      })
      .then(async () => {
        loadImage('./resources/captcha-background-image.jpg').then(async (image) => {
          ctx.drawImage(image, 0, 0, 290, 80);
          ctx.fillText(randWord, 90, 45);

          const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'type-race.png' });

          let getReady;
          let theImage;

          getReady = await msg.channel.send('Are you ready? \n3');
          await this.client.util.wait(1000);
          getReady.edit('Are you ready? \n2');
          await this.client.util.wait(1000);
          getReady.edit('Are you ready? \n1');
          await this.client.util.wait(1000);
          getReady.edit('Go!');
          theImage = await msg.channel.send({ files: [attachment] });
          if (getReady) getReady.delete().catch(() => {});

          const filter2 = (message) => {
            return message.content.toLowerCase() === randWord.toLowerCase();
          };

          const collected2 = await msg.channel.awaitMessages({
            filter: filter2,
            max: 1,
            time: 30000,
            errors: ['time'],
          });

          if (!collected2) {
            if (getReady) getReady.delete().catch(() => {});
            this.client.games.delete(msg.channel.id);
            return msg.channel.send('No one guessed the correct word in time.');
          }

          const t2 = theImage.createdAt;
          const t1 = collected2.first().createdAt;
          const winner = collected2.first().author;
          const time = (t1 - t2) / 1000;

          const HS = { score: time, user: winner.tag };
          const oldHS = (await db.get('global.highScores.typeCompetition')) || HS;
          let highScore = oldHS.score;
          let highScoreUser = oldHS.user;
          if (HS.score < oldHS.score) {
            await db.set('global.highScores.typerCompetition', HS);
            highScore = HS.score;
            highScoreUser = winner.tag;
          }

          const em1 = new EmbedBuilder()
            .setTitle('Winner!')
            .setColor(color)
            .setDescription(
              stripIndents`
                  ${winner} won! :tada:
                  Time: ${time} seconds`,
            )
            .addFields([{ name: 'High Score', value: `${highScore} seconds by ${highScoreUser}` }]);
          this.client.games.delete(msg.channel.id);
          return msg.channel.send({ embeds: [em1] });
        });
      })
      .catch(() => {
        this.client.games.delete(msg.channel.id);
        return msg.channel.send('No one reacted in time');
      });
  }
}
module.exports = TyperCompetition;
