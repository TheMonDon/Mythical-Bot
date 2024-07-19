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
    let infoMem = msg.member;

    if (args?.length > 0) infoMem = await this.client.util.getMember(msg, args.join(' ').toLowerCase());

    if (!infoMem) {
      // If no member is found, try to get the user by ID
      const fid = args.join(' ').toLowerCase().replace(/<@|>/g, '');
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

    infoMem = infoMem.user ? infoMem.user : infoMem;
    const embed = new EmbedBuilder()
      .setTitle(`${infoMem.username}'s Avatar`)
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setImage(infoMem.displayAvatarURL({ size: 4096, extension: 'png' }));

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Avatar;
