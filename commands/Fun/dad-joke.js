const Command = require('../../base/Command.js');
const fetch = require('node-fetch');
const DiscordJS = require('discord.js');

class dadJoke extends Command {
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
        const embed = new DiscordJS.MessageEmbed()
          .setTitle('Dad Joke')
          .setColor('RANDOM')
          .setDescription(body)
          .setFooter('Powered by: https://icanhazdadjoke.com/');
        return msg.channel.send({embeds: [embed]});
      });
  }
}
module.exports = dadJoke;
