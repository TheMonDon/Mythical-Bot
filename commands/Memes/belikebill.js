const Command = require('../../base/Command.js');
const request = require('request-promise-native');

class blbCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'belikebill',
      description: 'Random belikebill meme',
      usage: 'belikebill',
      category: 'Memes',
      aliases: ['blb']
    });
  }

  async run (msg, args) {
    if (!args || args.length < 1) {
      const msg1 = await msg.channel.send('Please wait generating your meme!');
      const options = {
        url: 'https://belikebill.ga/billgen-API.php',
        qs: {
          default: 1,
          name: msg.author.username
        },
        encoding: null
      };

      const response = await request(options);
      msg1.delete();
      msg.channel.send({
        files: [response]
      });
    } else {
      const msg1 = await msg.channel.send('Please wait generating your meme!');
      const text = args.join(' ').replace(/\n/g, '%0D%0A%0D%0A');
      const options = {
        url: 'https://belikebill.ga/billgen-API.php',
        qs: {
          text
        },
        encoding: null
      };

      const response = await request(options);
      msg1.delete();

      msg.channel.send({
        files: [response]
      });
    }
  }
}

module.exports = blbCommand;
