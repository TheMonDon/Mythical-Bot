const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class DeleteGiveaway extends Command {
  constructor (client) {
    super(client, {
      name: 'delete-giveaway',
      description: 'Delete a giveaway',
      usage: 'Delete-Giveaway <Message ID>',
      category: 'Giveaways',
      aliases: ['deletegiveaway', 'delgiveaway', 'gdelete'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}Delete-Giveaway <Message ID>`;
    if (!args || args.length < 1) return msg.channel.send(usage);

    if (!msg.member.permissions.has('ManageMessages')) {
      return msg.channel.send(':x: You need to have the Manage Nessages permissions to delete giveaways');
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

    // Delete the giveaway
    this.client.giveawaysManager.delete(giveaway.messageId)
      .then(() => {
        // Success message
        msg.channel.send('Giveaway deleted!');
      })
      .catch((e) => {
        ErrorEmbed.setTitle(e);
        return msg.channel.send(ErrorEmbed);
      });
  }
}

module.exports = DeleteGiveaway;
