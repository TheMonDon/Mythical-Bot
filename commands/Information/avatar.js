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

  async run(msg, text) {
    let infoMem = msg.member;

    // If text is provided, try to get the member
    if (text?.length > 0) infoMem = await this.client.util.getMember(msg, text.join(' ').toLowerCase());

    if (!infoMem) {
      // If no member is found, try to get the user by ID
      const fid = text.join(' ').toLowerCase().replace(/<@|>/g, '');
      try {
        infoMem = await this.client.users.fetch(fid);
      } catch (err) {
        // If no user is found, use the author
        infoMem = msg.member;
        infoMem.user.fetch();
      }
    } else {
      // If a member is found, fetch the user
      infoMem.user.fetch();
    }

    await msg.guild.members.fetch();

    const embed = new EmbedBuilder()
      .setTitle(`${infoMem.user.username}'s Avatar`)
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setImage(infoMem.user.displayAvatarURL({ size: 4096 }));

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Avatar;
