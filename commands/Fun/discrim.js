const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

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

    const em = new EmbedBuilder()
      .setDescription(output.slice(0, 4000))
      .addFields([
        { name: 'Total Discriminators', value: output.length }
      ]);

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Discrim;
