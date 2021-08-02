const Command = require('../../base/Command.js');
const fetch = require('node-fetch');

class blbCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'belikebill',
      description: 'Generate a random belikebill meme or make your own',
      usage: 'belikebill [text]',
      category: 'Memes',
      aliases: ['blb']
    });
  }

  async run (msg, args) {
    const url = 'https://belikebill.ga/billgen-API.php';
    if (!args || args.length < 1) {
      const msg1 = await msg.channel.send('Please wait generating your meme!');
      const params = new URLSearchParams({ default: 1, name: msg.author.username });

      const response = await fetch(url + params);
      msg1.delete();
      msg.channel.send({
        files: [response]
      })
        .catch(() => {
          msg.channel.send('Sorry, something went wrong. Please try again later.');
        });
    } else {
      const msg1 = await msg.channel.send('Please wait generating your meme!');
      const text = args.join(' ').replace(/\n/g, '%0D%0A%0D%0A');
      const params = new URLSearchParams({ text });

      const response = await fetch(url + params);
      msg1.delete();

      msg.channel.send({
        files: [response]
      })
        .catch(() => {
          msg.channel.send('Sorry, something went wrong. Please try again later.');
        });
    }
  }
}

module.exports = blbCommand;
