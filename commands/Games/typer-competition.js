const Command = require('../../base/Command.js');
const { wait } = require('../../util/Util.js');
const { EmbedBuilder, MessageAttachment } = require('discord.js');
const https = require('https');
const fntPath = './resources/fonts/Moms_Typewriter.ttf';
const fs = require('fs');
const { registerFont, createCanvas, loadImage } = require('canvas');
const randomWords = require('random-words');
const { stripIndents } = require('common-tags');
const db = require('quick.db');

class TyperCompetition extends Command {
  constructor (client) {
    super(client, {
      name: 'typer-competition',
      description: 'See who can type the fastest.',
      usage: 'typer-competition',
      category: 'Games',
      aliases: ['typercompetition', 'tc']
    });
  }

  async run (msg) {
    const current = this.client.games.get(msg.channel.id);
    if (current) return msg.reply(`Please wait until the current game of \`${current.name}\` is finished.`);
    this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id, data: Date.now() });

    const randWord = randomWords(1).toString();

    // Check if font file exists
    if (!fs.existsSync(fntPath)) {
      const file = fs.createWriteStream(fntPath);
      https.get('https://raw.githubusercontent.com/TheMonDon/storage/master/Moms_Typewriter.ttf', function (response) {
        response.pipe(file);
      });
      this.client.logger.log('Downloaded file to: ' + fntPath);
    }

    registerFont(fntPath, {
      family: 'Moms Typewriter'
    });

    const canvas = createCanvas(290, 80);
    const ctx = canvas.getContext('2d');
    ctx.font = '18px "Moms Typewriter';

    if (msg.guild.members.me.permissions.has('ManageMessages')) msg.delete();

    const em = new EmbedBuilder()
      .setTitle('Typer Competition')
      .setColor('#41f4eb')
      .setDescription(stripIndents`
      Who is the fastest? I will send a word, the person who types it the quickest wins!
      To start, 2 or more people must react with 🏁`);

    const embed1 = await msg.channel.send({ embeds: [em] });
    await embed1.react('🏁');

    const filter = (reaction, user) => {
      return reaction.emoji.name === '🏁' && !user.bot;
    };

    embed1.awaitReactions({
      filter,
      max: 2,
      time: 60000,
      errors: ['time']
    })
      .then(() => {
        loadImage('./resources/captcha-background-image.jpg')
          .then((image) => {
            ctx.drawImage(image, 0, 0, 290, 80);
            ctx.fillText(randWord, 90, 45);

            const attachment = new MessageAttachment(canvas.toBuffer(), 'type-race.png');

            let getReady;
            let theImage;

            (async () => {
              getReady = await msg.channel.send('Are you ready? \n3');
              await wait(1000);
              getReady.edit('Are you ready? \n2');
              await wait(1000);
              getReady.edit('Are you ready? \n1');
              await wait(1000);
              getReady.edit('Go!');
              theImage = await msg.channel.send(attachment);
            })();

            const filter2 = (message) => {
              return message.content.toLowerCase() === randWord.toLowerCase();
            };
            msg.channel.awaitMessages({
              filter2,
              max: 1,
              time: 30000,
              errors: ['time']
            })
              .then((collected2) => {
                getReady.delete();

                const t2 = theImage.createdAt;
                const t1 = collected2.first().createdAt;
                const winner = collected2.first().author;
                const time = (t1 - t2) / 1000;

                const HS = { score: time, user: winner.tag };
                const oldHS = db.get('global.highScores.typeCompetition') || HS;
                let highScore = oldHS.score;
                let highScoreUser = oldHS.user;
                if (HS.score < oldHS.score) {
                  db.set('global.highScores.typerCompetition', HS);
                  highScore = HS.score;
                  highScoreUser = 'You';
                }

                const em1 = new EmbedBuilder()
                  .setTitle('Winner!')
                  .setColor('#41f4eb')
                  .setDescription(stripIndents`
                  ${winner} won! :tada:
                  Time: ${time}s`)
                  .addFields([{ name: 'High Score', value: `${highScore}s by ${highScoreUser}` }]);
                this.client.games.delete(msg.channel.id);
                return msg.channel.send(em1);
              })
              .catch(() => {
                getReady.delete();
                this.client.games.delete(msg.channel.id);
                return msg.channel.send('No one guessed the correct word in time.');
              });
          });
      })
      .catch(() => {
        this.client.games.delete(msg.channel.id);
        return msg.channel.send('No one reacted in time');
      });
  }
}
module.exports = TyperCompetition;
