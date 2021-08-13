const Command = require('../../base/Command.js');
const fetch = require('node-superfetch');
const DiscordJS = require('discord.js');

class insult extends Command {
  constructor (client) {
    super(client, {
      name: 'insult',
      description: 'Get a random insult.',
      usage: 'insult',
      category: 'Fun'
    });
  }

  async run (msg) {
    const { body } = await fetch.get('https://evilinsult.com/generate_insult.php?lang=en&type=json')
      .catch(() => {
        return msg.channel.send('Something went wrong, please try again in a few moments.');
      });

    const em = new DiscordJS.MessageEmbed()
      .setTitle(body.insult)
      .setColor('RANDOM')
      .setFooter(`ID: ${body.number}`);
    return msg.channel.send({embeds: [em]});
  }
}
module.exports = insult;
