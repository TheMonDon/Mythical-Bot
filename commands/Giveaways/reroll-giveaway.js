const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class RerollGiveaway extends Command {
  constructor (client) {
    super(client, {
      name: 'reroll-giveaway',
      description: 'Reroll a giveaway',
      usage: 'reroll-giveaway <Message ID>',
      category: 'Giveaways',
      aliases: ['reroll', 'rerollgiveaway'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}reroll-giveaway <Message ID>`;
    if (!args || args.length < 1) return msg.channel.send(usage);

    if (!msg.member.permissions.has('MANAGE_MESSAGES')) {
      return msg.channel.send(':x: You need to have the manage messages permissions to reroll giveaways');
    }

    const query = args.join(' ');

    const ErrorEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setTitle('Invalid Message ID')
      .setColor('#FF0000');

    if (isNaN(query)) {
      ErrorEmbed.setDescription(usage);
      return msg.channel.send({ embeds: [ErrorEmbed] });
    }

    const giveaway = this.client.giveawaysManager.giveaways.find((g) => g.messageId === query && g.guildId === msg.guild.id);

    // If no giveaway was found
    if (!giveaway) {
      ErrorEmbed.setTitle('Unable to find a giveaway for `' + query + '`.');
      return msg.channel.send(ErrorEmbed);
    }

    if (!giveaway.ended) {
      ErrorEmbed.setTitle('The giveaway is not ended yet.');
      return msg.channel.send(ErrorEmbed);
    }

    // Reroll the giveaway
    this.client.giveawaysManager.reroll(giveaway.messageId)
      .then(() => {
        // Success message
        msg.channel.send('Giveaway rerolled!');
      })
      .catch((e) => {
        ErrorEmbed.setTitle(e);
        return msg.channel.send(ErrorEmbed);
      });
  }
}

module.exports = RerollGiveaway;
