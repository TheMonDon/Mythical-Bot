const Command = require('../../base/Command.js');
const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

class DadJoke extends Command {
  constructor (client) {
    super(client, {
      name: 'dad-joke',
      description: 'Send a dad joke.',
      usage: 'dad-joke',
      category: 'Fun',
      aliases: ['dadjoke', 'dj', 'dadj', 'djoke']
    });
  }

  async run (msg) {
    fetch('https://icanhazdadjoke.com/', {
      headers: { Accept: 'text/plain' }
    })
      .then(res => res.text())
      .then(body => {
        const embed = new EmbedBuilder()
          .setTitle('Dad Joke')
          .setColor('#0099CC')
          .setDescription(body)
          .setFooter({ text: 'Powered by: https://icanhazdadjoke.com/' });
        return msg.channel.send({ embeds: [embed] });
      });
  }
}
module.exports = DadJoke;
