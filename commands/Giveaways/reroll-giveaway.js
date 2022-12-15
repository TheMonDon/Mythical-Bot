const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class RerollGiveaway extends Command {
  constructor (client) {
    super(client, {
      name: 'reroll-giveaway',
      description: 'Reroll a giveaway',
      usage: 'Reroll-Giveaway <Message ID>',
      category: 'Giveaways',
      aliases: ['reroll', 'rerollgiveaway', 'greroll'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}Reroll-Giveaway <Message ID>`;
    if (!args || args.length < 1) return msg.channel.send(usage);

    if (!msg.member.permissions.has('ManageMessages')) {
      return msg.channel.send(':x: You need to have the Manage Messages permissions to reroll giveaways');
    }

    const query = args.join('');

    const ErrorEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setTitle('Invalid Message ID')
      .setColor(msg.settings.embedErrorColor);

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
      ErrorEmbed.setTitle('That giveaway has not ended yet.');
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
