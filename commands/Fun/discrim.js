const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');

class Discrim extends Command {
  constructor (client) {
    super(client, {
      name: 'discrim',
      description: 'Find all the users the bot has with the same discrim.',
      usage: 'discrim <discrim>',
      category: 'Fun',
      aliases: ['disc', 'discriminator']
    });
  }

  async run (msg, args) {
    const discrim = args.join(' ').replace('#', '');
    const output = this.client.users.cache.filter(user => user.discriminator === discrim).map(a => a.tag);

    if (!discrim || discrim.length < 4) return msg.channel.send('Please supply a valid discriminator to search for.');

    if (output.length < 1) return msg.channel.send(`No users found with the discriminator: ${discrim}`);

    const em = new DiscordJS.MessageEmbed()
      .addField('Total Discriminators', output.length)
      .setDescription(output.slice(0, 4000));
    if (output.length > 4000) em.addField('Showing first 4000 characters.');

    return msg.channel.send(em);
  }
}

module.exports = Discrim;
