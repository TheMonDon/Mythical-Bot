const Command = require('../../base/Command.js');

class cat extends Command {
  constructor (client) {
    super(client, {
      name: 'cat',
      description: 'Get a random image of a cute cat',
      usage: 'cat',
      category: 'Fun',
      aliases: ['kitty']
    });
  }

  async run (message) {
    const errorText = 'Error: 😿 No cats found.';

    try {
      const utils = this.utils;
      const responses = [
        { search: 'Looking for a kitty...', found: 'Found one!' },
      ];

      const response = responses[utils.getRandomInt(0, responses.length - 1)];
      const msg = await this.sendMessage(message.channel, response.search);

      const res = await this._catCache.get();

      if (!res || !res.redirects || !res.redirects.length) {
        return this.error(message.channel, errorText);
      }

      return msg.edit({
        content: response.found,
        embed: {
          title: '🐱 Meowww..',
          color: 0x3498db,
          image: {
            url: res.redirects[0],
          },
          url: res.redirects[0],
        },
      });
    } catch (err) {
      return this.error(message.channel, errorText);
    }
  }
}

module.exports = cat;
