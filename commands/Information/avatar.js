const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Avatar extends Command {
  constructor(client) {
    super(client, {
      name: 'avatar',
      description: 'Get a users avatar',
      usage: 'avatar <user>',
      category: 'Information',
    });
  }

  async run(msg, args) {
    let infoMem;

    if (args?.length > 0) {
      // Try to fetch the member from the provided text
      infoMem = await this.client.util.getMember(msg, args.join(' ').toLowerCase());
    }

    if (!infoMem) {
      // If no member is found, attempt to fetch the user by ID
      const findId = args?.join(' ').toLowerCase().replace(/<@|>/g, '');
      if (findId) {
        try {
          infoMem = await this.client.users.fetch(findId, { force: true });
        } catch (_) {}
      }
    }

    // Default to the author if no user/member is found
    if (!infoMem) {
      infoMem = msg.guild ? msg.member : msg.author;
    }

    // Get the user object
    const fetchedUser = infoMem.user || infoMem;

    const embed = new EmbedBuilder()
      .setTitle(`${fetchedUser.username}'s Avatar`)
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setImage(fetchedUser.displayAvatarURL({ size: 4096, extension: 'png' }));

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Avatar;
