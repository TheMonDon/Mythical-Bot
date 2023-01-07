const Command = require('../../base/Command.js');
const request = require('node-superfetch');
const { EmbedBuilder } = require('discord.js');

class DadJoke extends Command {
  constructor (client) {
    super(client, {
      name: 'dad-joke',
      description: 'Get a random dad joke.',
      usage: 'dad-joke',
      category: 'Fun',
      aliases: ['dadjoke']
    });
  }

  async run (msg, args) {
    try {
      const { body } = await request.get('https://icanhazdadjoke.com/').set('Accept', 'application/json');
      const embed = new EmbedBuilder()
        .setTitle('Dad Joke')
        .setColor(msg.settings.embedColor)
        .setDescription(`**Dad Joke:** \n${body.joke}`)
        .setFooter({ text: `Powered by: https://icanhazdadjoke.com/ ID: ${body.id}` });

      return msg.channel.send({ embeds: [embed] });
    } catch (err) {
      return msg.channel.send(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
    }
  }
}
module.exports = DadJoke;
