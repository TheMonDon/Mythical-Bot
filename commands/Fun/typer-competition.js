const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-superfetch');
const https = require('https');
const path_fnt = './fonts/Moms_Typewriter.ttf';
const fs = require('fs');
const {
  registerFont,
  createCanvas,
  loadImage,
} = require('canvas');
const randomWords = require('random-words');
const {
  stripIndents
} = require('common-tags');
const sleep = require('util').promisify(setTimeout);

class typerCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'typer-competition',
      description: 'PLay a game of speed',
      usage: 'typer-competition',
      category: 'Fun',
      aliases: ['typercompetition', 'tc']
    });
  }

  async run (msg) {
    const randWord = randomWords(1).toString();
    // Check if font file exists
    if (!fs.existsSync(path_fnt)) {
      const file = fs.createWriteStream(path_fnt);
      https.get('https://raw.githubusercontent.com/TheMonDon/storage/master/Moms_Typewriter.ttf', function (response) {
        response.pipe(file);
      });
      console.log('Downloaded file to: ' + path_fnt);
    }

    registerFont(path_fnt, {
      family: 'Moms Typewriter'
    });

    const canvas = createCanvas(290, 80);
    const ctx = canvas.getContext('2d');
    ctx.font = '18px "Moms Typewriter';

    if (msg.guild.me.permissions.has('MANAGE_MESSAGES')) msg.delete();

    const em = new DiscordJS.MessageEmbed()
      .setTitle('Typer Competition')
      .setColor('#41f4eb')
      .setDescription(stripIndents`
      Who is the fastest? I will send a word, the person who types it the quickest wins!
      To start, 2 or more people must react with 🏁`);

    const embed1 = await msg.channel.send(em);
    await embed1.react('🏁');

    const filter = (reaction, user) => {
      return reaction.emoji.name === '🏁' && !user.bot;
    };
    embed1.awaitReactions(filter, {
      max: 2,
      time: 60000,
      errors: ['time']
    })
      .then((collected) => {

        loadImage('https://i.lensdump.com/i/Wc8DKQ.jpg')
          .then((image) => {

            ctx.drawImage(image, 0, 0, 290, 80);
            ctx.fillText(randWord, 90, 45);

            const attachment = new DiscordJS.MessageAttachment(canvas.toBuffer(), 'type-race.png');

            let getReady;
            let theImage;

            (async () => {

              getReady = await msg.channel.send('Are you ready? \n3');
              await sleep(1000);
              getReady.edit('Are you ready? \n2');
              await sleep(1000);
              getReady.edit('Are you ready? \n1');
              await sleep(1000);
              getReady.edit('Go!');
              theImage = await msg.channel.send(attachment);

            })();

            const filter2 = (message) => {
              return message.content.toLowerCase() === randWord.toLowerCase();
            };
            msg.channel.awaitMessages(filter2, {
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

                const em1 = new DiscordJS.MessageEmbed()
                  .setTitle('Winner!')
                  .setColor('#41f4eb')
                  .setDescription(stripIndents`
                  ${winner} won! :tada:
                  Time: ${time}s`);
                msg.channel.send(em1);

              })
              .catch(() => {
                getReady.delete();
                msg.channel.send('No one guessed the correct word in time.');
              });
          });
      })
      .catch(() => {
        msg.channel.send('No one reacted in time');
      });
  }
}
module.exports = typerCommand;
